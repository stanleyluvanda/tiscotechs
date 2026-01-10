// src/lib/videosApi.js
import { fetchPosts } from "./postsApi.js";

// Admin posts videos into the same posts store, under this scope:
const VIDEO_SCOPE = "admin-video-posts";

export async function fetchAdminVideos() {
  const data = await fetchPosts({ scope: VIDEO_SCOPE });

  // Accept multiple possible backend shapes safely:
  const list =
    (Array.isArray(data?.posts) && data.posts) ||
    (Array.isArray(data?.videos) && data.videos) ||
    (Array.isArray(data?.items) && data.items) ||
    [];

  return list;
}