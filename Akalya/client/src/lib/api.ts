// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function to get auth token
const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Helper function to set auth token
const setToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

// Helper function to remove auth token
const removeToken = (): void => {
  localStorage.removeItem('auth_token');
};

// Generic fetch wrapper with improved error handling and debugging
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Debug: show outgoing request in console (can remove later)
  // eslint-disable-next-line no-console
  console.debug('[apiFetch] Request:', { url: `${API_BASE_URL}${endpoint}`, options: { ...options, headers } });

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If 401 — clear token and throw a clear error (helps client decide to sign-out)
  if (response.status === 401) {
    try { removeToken(); } catch (e) { /* ignore */ }
    // Try to parse server message if any
    let errBody: any = { error: 'Invalid or expired token' };
    try {
      errBody = await response.json();
    } catch {
      // ignore parse error
    }
    const message = errBody?.error || errBody?.message || 'Invalid or expired token';
    const err = new Error(message);
    // attach status for callers
    (err as any).status = 401;
    throw err;
  }

  // For other non-2xx codes, try to parse JSON error and throw
  if (!response.ok) {
    let errorBody: any = { error: `HTTP error! status: ${response.status}` };
    try {
      errorBody = await response.json();
    } catch {
      // response may not be JSON
    }
    const message = errorBody?.error || errorBody?.message || `HTTP error! status: ${response.status}`;
    const err = new Error(message);
    (err as any).status = response.status;
    throw err;
  }

  // Try to parse JSON (some endpoints might return empty body)
  try {
    const data = await response.json().catch(() => null);
    // Debug: show response
    // eslint-disable-next-line no-console
    console.debug('[apiFetch] Response:', { url: `${API_BASE_URL}${endpoint}`, status: response.status, data });
    return data;
  } catch (err) {
    // If JSON parse fails, return null (or raw response text if needed)
    // eslint-disable-next-line no-console
    console.warn('[apiFetch] Response parse failed', err);
    return null;
  }
};

/* -------------------------
   Auth API
   ------------------------- */
export const authAPI = {
  signUp: async (email: string, password: string, fullName: string, role: 'student' | 'teacher' | 'admin') => {
    const data = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, role }),
    });
    // If server returned token in data, save it
    if (data?.token) {
      setToken(data.token);
    }
    // Normalize user object
    if (data?.user) {
      data.user.id = data.user.id || data.user._id;
    }
    return data;
  },

  signIn: async (email: string, password: string) => {
    const data = await apiFetch('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data?.token) {
      setToken(data.token);
    }
    if (data?.user) {
      data.user.id = data.user.id || data.user._id;
    }
    return data;
  },

  signOut: async () => {
    try {
      await apiFetch('/auth/signout', { method: 'POST' });
    } catch (error) {
      // log and continue — ensure token removed
      // eslint-disable-next-line no-console
      console.warn('Sign out error (ignored):', error);
    } finally {
      removeToken();
    }
  },

  getCurrentUser: async () => {
    const data = await apiFetch('/auth/me');
    if (data?.user) {
      data.user.id = data.user.id || data.user._id;
    }
    return data;
  },

  getUserRole: async () => {
    const data = await apiFetch('/auth/role');
    return data?.role;
  },

  updateRole: async (role: 'student' | 'teacher' | 'admin') => {
    return apiFetch('/auth/role', {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },
};

/* -------------------------
   Courses API
   ------------------------- */
export const coursesAPI = {
  getAll: async () => {
    return apiFetch('/courses');
  },

  getById: async (id: string) => {
    return apiFetch(`/courses/${id}`);
  },

  // create now accepts optional url
  create: async (
    title: string,
    description: string,
    status: 'draft' | 'published',
    url?: string | null
  ) => {
    return apiFetch('/courses', {
      method: 'POST',
      body: JSON.stringify({ title, description, status, url }),
    });
  },

  update: async (id: string, data: { title?: string; description?: string; status?: string; url?: string | null }) => {
    return apiFetch(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiFetch(`/courses/${id}`, {
      method: 'DELETE',
    });
  },
};

/* -------------------------
   Assignments API
   ------------------------- */
export const assignmentsAPI = {
  getAll: async () => {
    return apiFetch('/assignments');
  },

  getById: async (id: string) => {
    return apiFetch(`/assignments/${id}`);
  },

// replace the current create in assignmentsAPI with this
create: async (courseId: string, title: string, description: string, dueDate: string, maxScore: number) => {
  // Build the payload exactly as we intend to send it
  const due_iso = dueDate ? new Date(dueDate).toISOString() : ""; // change if backend wants YYYY-MM-DD

  const payload: any = {
    courseId,
    title,
    description,
    due_date: due_iso,  // backend expects snake_case
    max_score: maxScore,
  };

  // Log the payload so you can inspect in console (and ensure it's a plain object)
  // eslint-disable-next-line no-console
  console.debug('[assignmentsAPI.create] payload object:', payload);
  // eslint-disable-next-line no-console
  console.debug('[assignmentsAPI.create] payload JSON:', JSON.stringify(payload));

  // Call apiFetch but capture raw response if error to show server message
  const res = await fetch(`${API_BASE_URL}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: JSON.stringify(payload),
  });

  // If not ok, read raw text (some servers return a plain string)
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    // eslint-disable-next-line no-console
    console.error('[assignmentsAPI.create] server responded non-OK', res.status, txt);
    // rethrow an Error containing server text so upstream toast shows it
    const err = new Error(txt || `HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  // parse JSON if any
  return res.json().catch(() => null);
},


  update: async (id: string, data: any) => {
    return apiFetch(`/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiFetch(`/assignments/${id}`, {
      method: 'DELETE',
    });
  },
};

/* -------------------------
   Submissions API
   ------------------------- */
   export const submissionsAPI = {
    getAll: async () => {
      return apiFetch('/submissions');
    },
  
    getMine: async () => {
      return apiFetch('/submissions/me');
    },
  
    getById: async (id: string) => {
      return apiFetch(`/submissions/${id}`);
    },
  
    create: async (assignmentId: string, submissionText: string, submissionFileUrl?: string) => {
      return apiFetch('/submissions', {
        method: 'POST',
        body: JSON.stringify({ assignmentId, submissionText, submissionFileUrl }),
      });
    },
  
    grade: async (id: string, grade: number, feedback: string) => {
      return apiFetch(`/submissions/${id}/grade`, {
        method: 'PUT',
        body: JSON.stringify({ grade, feedback }),
      });
    },
  };
  

/* -------------------------
   Classes API
   ------------------------- */
export const classesAPI = {
  getAll: async (filters?: { courseId?: string; status?: string; hasVideo?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.courseId) params.append('courseId', filters.courseId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.hasVideo) params.append('hasVideo', 'true');

    const query = params.toString();
    return apiFetch(`/classes${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiFetch(`/classes/${id}`);
  },

  create: async (data: {
    courseId?: string;
    title: string;
    description?: string;
    classType: 'live' | 'recorded';
    scheduledAt?: string;
    videoUrl?: string;
    transcript?: string;
    isDownloadable?: boolean;
    isPublic?: boolean;
    hasVideo?: boolean;
  }) => {
    return apiFetch('/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  

  update: async (id: string, data: any) => {
    return apiFetch(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

/* -------------------------
   Enrollments API
   ------------------------- */
export const enrollmentsAPI = {
  getAll: async () => {
    return apiFetch('/enrollments');
  },

  create: async (courseId: string, studentId?: string) => {
    // Build payload with both common key names (frontend/backends differ)
    const payload: any = {
      courseId,
      course_id: courseId, // include snake_case variant in case the backend expects it
    };
  
    // If caller passes an explicit studentId (admin enrolling a student), include it
    if (studentId) {
      payload.studentId = studentId;
      payload.user_id = studentId; // include a snake_case variant too
    }
  
    // Debug: show payload before sending
    // eslint-disable-next-line no-console
    console.debug('[enrollmentsAPI.create] payload:', payload);
  
    // Use apiFetch (which attaches headers + token) — we stringify here
    try {
      return await apiFetch('/enrollments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      // If apiFetch threw, log the error with any server message for debugging
      // eslint-disable-next-line no-console
      console.error('[enrollmentsAPI.create] enroll failed:', err?.message || err);
      throw err;
    }
  },
  

  update: async (id: string, progress: number) => {
    return apiFetch(`/enrollments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ progress }),
    });
  },
};

/* -------------------------
   Notes API
   ------------------------- */
export const notesAPI = {
  getAll: async (filters?: { courseId?: string; classId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.courseId) params.append('courseId', filters.courseId);
    if (filters?.classId) params.append('classId', filters.classId);

    const query = params.toString();
    return apiFetch(`/notes${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiFetch(`/notes/${id}`);
  },

  create: async (data: {
    title: string;
    content: string;
    noteType: 'teaching' | 'learning' | 'revision';
    courseId?: string;
    classId?: string;
  }) => {
    return apiFetch('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiFetch(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiFetch(`/notes/${id}`, {
      method: 'DELETE',
    });
  },
};

/* -------------------------
   Chat API
   ------------------------- */
export const chatAPI = {
  getConversations: async () => {
    return apiFetch('/chat/conversations');
  },

  createConversation: async (title?: string) => {
    return apiFetch('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  getMessages: async (conversationId: string) => {
    return apiFetch(`/chat/conversations/${conversationId}/messages`);
  },

  saveMessage: async (conversationId: string, role: 'user' | 'assistant', content: string) => {
    return apiFetch('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ conversationId, role, content }),
    });
  },

  // src/lib/api.ts  (replace chatAssistant)
// replace the existing chatAssistant function with this
chatAssistant: async (messages: Array<{ role: string; content: string }>) => {
  try {
    const data: any = await apiFetch('/chat/assistant', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });

    // If backend returned nothing, provide a default empty message
    if (!data) return { message: '', raw: data };

    // If backend already returned normalized { message, raw } keep it
    if (typeof data === 'object' && (data.message || data.raw)) {
      // ensure message is string
      return { message: String(data.message ?? ''), raw: data.raw ?? data };
    }

    // If backend returned a simple string
    if (typeof data === 'string') {
      return { message: data, raw: data };
    }

    // Common shapes:
    if (data.message && typeof data.message === 'string') {
      return { message: data.message, raw: data };
    }
    if (data.text && typeof data.text === 'string') {
      return { message: data.text, raw: data };
    }
    if (data.answer && typeof data.answer === 'string') {
      return { message: data.answer, raw: data };
    }

    // OpenAI-like: { choices: [ { message: { content: "..." } } ] }
    if (Array.isArray(data.choices) && data.choices[0]) {
      const c = data.choices[0];
      const content = (c.message && (c.message.content || c.message.text)) || c.text || (typeof c === 'string' ? c : '');
      return { message: String(content ?? ''), raw: data };
    }

    // As a last resort, try to extract plain text from nested output/candidates
    const fallback =
      (data.output && data.output[0] && data.output[0].content && data.output[0].content[0] && data.output[0].content[0].text) ||
      (data.candidates && data.candidates[0] && data.candidates[0].content) ||
      null;

    if (fallback) return { message: String(fallback), raw: data };

    // Final fallback: stringify the entire object (kept small)
    try {
      return { message: JSON.stringify(data).slice(0, 4000), raw: data };
    } catch {
      return { message: '', raw: data };
    }
  } catch (err) {
    console.error('[chatAPI.chatAssistant] error:', err);
    throw err; // apiFetch already wraps errors with message/status
  }
},
};

/* -------------------------
   Users API
   ------------------------- */
export const usersAPI = {
  getAll: async () => {
    return apiFetch('/users');
  },

  getById: async (id: string) => {
    return apiFetch(`/users/${id}`);
  },
};



export const queriesAPI = {
  getAll: async (params?: Record<string, any>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch(`/queries${qs}`);
  },
  create: async (payload: { courseId?: string; courseTitle?: string; subject?: string; message: string }) => {
    return apiFetch("/queries", { method: "POST", body: JSON.stringify(payload) });
  },
  update: async (id: string, updates: any) => {
    return apiFetch(`/queries/${id}`, { method: "PUT", body: JSON.stringify(updates) });
  },
};

/* -------------------------   Scholarships API   ------------------------- */
export const scholarshipsAPI = {
  getAll: async (params?: { category?: string; forClass?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return apiFetch(`/scholarships${qs}`);
  },
  getById: async (id: string) => apiFetch(`/scholarships/${id}`),
  create: async (data: any) => apiFetch("/scholarships", { method: "POST", body: JSON.stringify(data) }),
  update: async (id: string, data: any) => apiFetch(`/scholarships/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: async (id: string) => apiFetch(`/scholarships/${id}`, { method: "DELETE" }),
};

/* -------------------------   Entrance Exams API   ------------------------- */
export const entranceExamsAPI = {
  getAll: async (params?: { level?: string; state?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return apiFetch(`/entrance-exams${qs}`);
  },
  getBySlug: async (slug: string) => apiFetch(`/entrance-exams/slug/${slug}`),
  getById: async (id: string) => apiFetch(`/entrance-exams/${id}`),
  create: async (data: any) => apiFetch("/entrance-exams", { method: "POST", body: JSON.stringify(data) }),
  update: async (id: string, data: any) => apiFetch(`/entrance-exams/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: async (id: string) => apiFetch(`/entrance-exams/${id}`, { method: "DELETE" }),
};

/* -------------------------   Jobs API   ------------------------- */
export const jobsAPI = {
  getAll: async (params?: { category?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return apiFetch(`/jobs${qs}`);
  },
  getById: async (id: string) => apiFetch(`/jobs/${id}`),
  create: async (data: any) => apiFetch("/jobs", { method: "POST", body: JSON.stringify(data) }),
  update: async (id: string, data: any) => apiFetch(`/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: async (id: string) => apiFetch(`/jobs/${id}`, { method: "DELETE" }),
};

/* -------------------------   Preparation Resources API   ------------------------- */
export const preparationResourcesAPI = {
  getAll: async (params?: { type?: string; classLevel?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return apiFetch(`/preparation-resources${qs}`);
  },
  getById: async (id: string) => apiFetch(`/preparation-resources/${id}`),
  create: async (data: any) => apiFetch("/preparation-resources", { method: "POST", body: JSON.stringify(data) }),
  update: async (id: string, data: any) => apiFetch(`/preparation-resources/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: async (id: string) => apiFetch(`/preparation-resources/${id}`, { method: "DELETE" }),
};

/* -------------------------   Practice API (Class 6–12)   ------------------------- */
export const practiceAPI = {
  getQuestions: async (classLevel: number, subject: string, limit?: number) => {
    const params = new URLSearchParams({ classLevel: String(classLevel), subject });
    if (limit) params.append("limit", String(limit));
    return apiFetch(`/practice/questions?${params}`);
  },
  submit: async (data: { answers: { questionId: string; selectedIndex: number }[]; timeSpentSeconds?: number; classLevel: number; subject: string }) =>
    apiFetch("/practice/submit", { method: "POST", body: JSON.stringify(data) }),
  getExplanation: async (questionId: string) => apiFetch(`/practice/explanation/${questionId}`),
  getMyHistory: async () => apiFetch("/practice/history"),
};

/* -------------------------   Mock Tests API   ------------------------- */
export const mockTestsAPI = {
  getAll: async () => apiFetch("/mock-tests"),
  getById: async (id: string) => apiFetch(`/mock-tests/${id}`),
  submit: async (data: { mockTestId: string; answers: { questionId: string; selectedIndex: number }[]; timeSpentSeconds?: number }) =>
    apiFetch("/mock-tests/submit", { method: "POST", body: JSON.stringify(data) }),
  getMyAttempts: async () => apiFetch("/mock-tests/my/attempts"),
};

/* -------------------------   Locker API   ------------------------- */
export const lockerAPI = {
  list: async () => apiFetch("/locker"),
  getUsage: async () => apiFetch("/locker/usage"),
  upload: async (file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE_URL}/locker/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `Upload failed: ${res.status}`);
    }
    return res.json();
  },
  rename: async (id: string, displayName: string) =>
    apiFetch(`/locker/${id}/rename`, { method: "PUT", body: JSON.stringify({ displayName }) }),
  delete: async (id: string) => apiFetch(`/locker/${id}`, { method: "DELETE" }),
  download: async (id: string, filename?: string) => {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/locker/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const name = filename || res.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/)?.[1] || "download";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};

/* -------------------------   Attendance API   ------------------------- */
export const attendanceAPI = {
  saveBulk: async (records: { courseId: string; studentId: string; date: string; status: 'present' | 'absent' }[]) => {
    return apiFetch('/attendance', {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
  },

  getStudentSummary: async (studentId: string) => {
    return apiFetch(`/attendance/student/${studentId}`);
  },

  getCourseHistory: async (courseId: string) => {
    return apiFetch(`/attendance/course/${courseId}`);
  },

  getPlatformSummary: async () => {
    return apiFetch('/attendance/summary');
  },
};

/* -------------------------   Notifications API   ------------------------- */
export const notificationsAPI = {
  getMine: async () => apiFetch('/notifications/me'),

  markRead: async (id: string) =>
    apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),

  markAllRead: async () =>
    apiFetch('/notifications/read-all', { method: 'PUT' }),
};