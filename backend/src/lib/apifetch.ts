export async function apiFetch(
  url: string,
  options: RequestInit = {}
) {
  let res = await fetch(url, {
    ...options,
    credentials: "include",
  });

  if (res.status === 401 && url !== "https://boatfinder.onrender.com/auth/refresh") {
    const refreshRes = await fetch("https://boatfinder.onrender.com/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if(!res) return
 
    if (!refreshRes.ok) {
      window.location.href = "/login";
      throw new Error("Session expired");
    }

    res = await fetch(url, {
      ...options,
      credentials: "include",
    });
  }

  return res;
}
