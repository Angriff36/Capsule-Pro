import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StyleSheet, Text } from "react-native";
import {
  MyWorkScreen,
  PrepListDetailScreen,
  PrepListsScreen,
  TasksScreen,
  TodayScreen,
} from "../screens";
import type { PrepListStackParamList, RootTabParamList } from "../types";

const Tab = createBottomTabNavigator<RootTabParamList>();
const PrepListStack = createStackNavigator<PrepListStackParamList>();

// Simple icon components using Text (we can replace with proper icons later)
function CalendarIcon({ focused }: { focused: boolean }) {
  return <Text style={[styles.icon, focused && styles.iconActive]}>📅</Text>;
}

function ClipboardIcon({ focused }: { focused: boolean }) {
  return <Text style={[styles.icon, focused && styles.iconActive]}>📋</Text>;
}

function ListChecksIcon({ focused }: { focused: boolean }) {
  return <Text style={[styles.icon, focused && styles.iconActive]}>✅</Text>;
}

function BriefcaseIcon({ focused }: { focused: boolean }) {
  return <Text style={[styles.icon, focused && styles.iconActive]}>💼</Text>;
}

// Stack navigator for Prep Lists tab (to handle detail screen)
function PrepListStackNavigator() {
  return (
    <PrepListStack.Navigator>
      <PrepListStack.Screen
        component={PrepListsScreen}
        name="PrepListsIndex"
        options={{ title: "Prep Lists" }}
      />
      <PrepListStack.Screen
        component={PrepListDetailScreen}
        name="PrepListDetail"
        options={{ title: "Prep List" }}
      />
    </PrepListStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: "#2563eb",
          tabBarInactiveTintColor: "#64748b",
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          headerShown: true,
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
        }}
      >
        <Tab.Screen
          component={TodayScreen}
          name="TodayTab"
          options={{
            title: "Today",
            tabBarLabel: "Today",
            tabBarIcon: ({ focused }) => <CalendarIcon focused={focused} />,
          }}
        />
        <Tab.Screen
          component={TasksScreen}
          name="TasksTab"
          options={{
            title: "Task Board",
            tabBarLabel: "Task Board",
            tabBarIcon: ({ focused }) => <ClipboardIcon focused={focused} />,
          }}
        />
        <Tab.Screen
          component={PrepListStackNavigator}
          name="PrepListsTab"
          options={{
            title: "Prep Lists",
            headerShown: false,
            tabBarLabel: "Prep Lists",
            tabBarIcon: ({ focused }) => <ListChecksIcon focused={focused} />,
          }}
        />
        <Tab.Screen
          component={MyWorkScreen}
          name="MyWorkTab"
          options={{
            title: "My Work",
            tabBarLabel: "My Work",
            tabBarIcon: ({ focused }) => <BriefcaseIcon focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  header: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  icon: {
    fontSize: 24,
  },
  iconActive: {
    opacity: 1,
  },
});
