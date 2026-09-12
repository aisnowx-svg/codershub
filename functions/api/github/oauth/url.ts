import { onRequestGet as authGet, onRequestPost as authPost } from '../auth';

export async function onRequestGet(context: any) {
  return authGet(context);
}

export async function onRequestPost(context: any) {
  return authPost(context);
}
