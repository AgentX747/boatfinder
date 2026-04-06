export async function apiFetch(url: string, options: RequestInit = {}) {
  // Always include credentials for cookies
  let res = await fetch(url, { ...options, credentials: "include" });

  // If 401, try refresh (skip calling refresh if we are already hitting refresh)
  if (res.status === 401 && !url.endsWith("/auth/refresh")) {
    const refreshRes = await fetch("https://boatfinder.onrender.com/auth/refresh", {
      method: "POST",
      credentials: "include", // required to send cookies
    });

    if (!refreshRes.ok) {
      // Redirect to login if refresh failed
      window.location.href = "/login";
      throw new Error("Session expired");
    }

    // Retry original request after refresh
    res = await fetch(url, { ...options, credentials: "include" });
  }

  // Check again for 401 after refresh
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  // Return JSON directly
  return res.json();
}