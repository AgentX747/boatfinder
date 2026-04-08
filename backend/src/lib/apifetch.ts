export async function apiFetch(url: string, options: RequestInit = {}) {
  let res = await fetch(url, { ...options, credentials: "include" });

  if (res.status === 401 && !url.endsWith("/auth/refresh")) {
    const refreshRes = await fetch("https://boatfinder.onrender.com/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!refreshRes.ok) {
      window.location.href = "/login";
      throw new Error("Session expired");
    }

    // Retry original request after refresh
    res = await fetch(url, { ...options, credentials: "include" });
  }

  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  return res; // ✅ return the raw Response object
}