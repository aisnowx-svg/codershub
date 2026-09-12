import { onRequestPost as callbackPost } from '../callback';

export async function onRequestPost(context: any) {
  return callbackPost(context);
}
