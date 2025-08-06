"use server";

export async function getLocationByIP(ip: string) {
  if (!ip) return null;
  const response = await fetch(`https://ipinfo.io/${ip}/json`);
  const data = await response.json();
  return data;
}
