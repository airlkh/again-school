import { Redirect } from 'expo-router';

export default function StoryCreate() {
  return <Redirect href="/upload?target=story" />;
}
