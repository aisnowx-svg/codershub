import { onRequestGet as reposGet, onRequestPost as reposPost } from './repos';

export async function onRequestGet(context: any) {
  return reposGet(context);
}

export async function onRequestPost(context: any) {
  return reposPost(context);
}
