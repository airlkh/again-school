import { Redirect } from 'expo-router';

export default function PostCreate() {
  return <Redirect href="/upload?target=post" />;
}
