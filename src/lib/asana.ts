// Asana API service — thin wrapper around Asana REST API using Personal Access Token

const ASANA_BASE = "https://app.asana.com/api/1.0";
const PAT = process.env.ASANA_PAT!;

async function asanaFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${ASANA_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Asana API ${res.status} on ${path}: ${text}`);
  }

  const json = await res.json() as { data: T };
  return json.data;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface AsanaUser {
  gid: string;
  name: string;
  email: string;
  resource_type: "user";
}

export interface AsanaProjectData {
  gid: string;
  name: string;
  color: string | null;
  workspace: { gid: string; name: string };
  resource_type: "project";
}

export interface AsanaTaskData {
  gid: string;
  name: string;
  notes: string;
  completed: boolean;
  completed_at: string | null;
  due_on: string | null;
  assignee: { gid: string; name: string } | null;
  projects: { gid: string; name: string }[];
  memberships: { section: { gid: string; name: string } | null }[];
  parent: { gid: string } | null;
  permalink_url: string;
  created_at: string;
  modified_at: string;
  resource_type: "task";
}

export interface AsanaStoryData {
  gid: string;
  type: string;
  text: string;
  created_by: { gid: string; name: string };
  created_at: string;
  resource_type: "story";
}

// ── Workspace / Members ────────────────────────────────────────────────────

export async function getWorkspaces() {
  return asanaFetch<AsanaUser[]>("/workspaces?opt_fields=gid,name");
}

export async function getWorkspaceMembers(workspaceGid: string) {
  return asanaFetch<AsanaUser[]>(
    `/workspaces/${workspaceGid}/users?opt_fields=gid,name,email`
  );
}

export async function getMe(): Promise<AsanaUser> {
  return asanaFetch<AsanaUser>("/users/me?opt_fields=gid,name,email,workspaces");
}

// ── Projects ───────────────────────────────────────────────────────────────

export async function getProjects(workspaceGid: string) {
  return asanaFetch<AsanaProjectData[]>(
    `/projects?workspace=${workspaceGid}&opt_fields=gid,name,color,workspace&limit=100`
  );
}

export async function getProject(projectGid: string) {
  return asanaFetch<AsanaProjectData>(
    `/projects/${projectGid}?opt_fields=gid,name,color,workspace`
  );
}

// ── Tasks ──────────────────────────────────────────────────────────────────

const TASK_FIELDS =
  "gid,name,notes,completed,completed_at,due_on,assignee,assignee.name,projects,projects.gid,memberships.section.name,parent,permalink_url,created_at,modified_at";

export async function getTask(taskGid: string): Promise<AsanaTaskData> {
  return asanaFetch<AsanaTaskData>(`/tasks/${taskGid}?opt_fields=${TASK_FIELDS}`);
}

export async function getProjectTasks(projectGid: string): Promise<AsanaTaskData[]> {
  // Paginate through all tasks
  const tasks: AsanaTaskData[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({
      project: projectGid,
      opt_fields: TASK_FIELDS,
      limit: "100",
      ...(offset ? { offset } : {}),
    });

    const res = await fetch(`${ASANA_BASE}/tasks?${params}`, {
      headers: {
        Authorization: `Bearer ${PAT}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) throw new Error(`Asana getProjectTasks ${res.status}`);
    const json = await res.json() as { data: AsanaTaskData[]; next_page?: { offset: string } };
    tasks.push(...json.data);
    offset = json.next_page?.offset;
  } while (offset);

  return tasks;
}

export async function getTasksCompletedSince(
  projectGid: string,
  since: Date
): Promise<AsanaTaskData[]> {
  const sinceStr = since.toISOString();
  const params = new URLSearchParams({
    project: projectGid,
    completed_since: sinceStr,
    opt_fields: TASK_FIELDS,
    limit: "100",
  });

  return asanaFetch<AsanaTaskData[]>(`/tasks?${params}`);
}

export async function getMyTasks(workspaceGid: string): Promise<AsanaTaskData[]> {
  const me = await getMe();
  const params = new URLSearchParams({
    assignee: me.gid,
    workspace: workspaceGid,
    completed_since: "now",  // only incomplete
    opt_fields: TASK_FIELDS,
    limit: "100",
  });
  return asanaFetch<AsanaTaskData[]>(`/tasks?${params}`);
}

// ── Write operations ───────────────────────────────────────────────────────

export async function updateTaskDescription(taskGid: string, notes: string) {
  return asanaFetch(`/tasks/${taskGid}`, {
    method: "PUT",
    body: JSON.stringify({ data: { notes } }),
  });
}

export async function addComment(taskGid: string, text: string) {
  return asanaFetch<AsanaStoryData>(`/tasks/${taskGid}/stories`, {
    method: "POST",
    body: JSON.stringify({ data: { text } }),
  });
}

export async function createSubtask(
  parentTaskGid: string,
  params: { name: string; notes?: string; assigneeGid?: string }
) {
  return asanaFetch<AsanaTaskData>(`/tasks/${parentTaskGid}/subtasks`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        name: params.name,
        ...(params.notes ? { notes: params.notes } : {}),
        ...(params.assigneeGid ? { assignee: params.assigneeGid } : {}),
      },
    }),
  });
}

export async function createTask(params: {
  name: string;
  notes?: string;
  projectGid: string;
  assigneeGid?: string;
  dueOn?: string; // YYYY-MM-DD
}) {
  return asanaFetch<AsanaTaskData>(`/tasks`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        name: params.name,
        ...(params.notes ? { notes: params.notes } : {}),
        projects: [params.projectGid],
        ...(params.assigneeGid ? { assignee: params.assigneeGid } : {}),
        ...(params.dueOn ? { due_on: params.dueOn } : {}),
      },
    }),
  });
}

// ── Webhooks ───────────────────────────────────────────────────────────────

export async function registerWebhook(resourceGid: string, targetUrl: string) {
  return asanaFetch(`/webhooks`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        resource: resourceGid,
        target: targetUrl,
        filters: [
          { resource_type: "task", action: "added" },
          { resource_type: "task", action: "changed" },
          { resource_type: "story", action: "added" },
        ],
      },
    }),
  });
}

export async function listWebhooks(workspaceGid: string) {
  return asanaFetch(`/webhooks?workspace=${workspaceGid}`);
}

export async function deleteWebhook(webhookGid: string) {
  return asanaFetch(`/webhooks/${webhookGid}`, { method: "DELETE" });
}
