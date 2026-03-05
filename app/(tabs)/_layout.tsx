import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconsName;
  iconOutline: IoniconsName;
}

const tabs: TabConfig[] = [
  { name: 'index', title: '홈', icon: 'home', iconOutline: 'home-outline' },
  { name: 'search', title: '동창찾기', icon: 'people', iconOutline: 'people-outline' },
  { name: 'meetup', title: '모임', icon: 'calendar', iconOutline: 'calendar-outline' },
  { name: 'jobs', title: '구인구직', icon: 'briefcase', iconOutline: 'briefcase-outline' },
  { name: 'profile', title: '내 정보', icon: 'person', iconOutline: 'person-outline' },
];

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            headerShown: tab.name !== 'index' && tab.name !== 'meetup',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.icon : tab.iconOutline}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
