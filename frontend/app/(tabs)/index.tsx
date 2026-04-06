import { Redirect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function TabsIndex() {
  const { isOperator } = useAuth();
  
  // Redirect to appropriate screen based on role
  if (isOperator) {
    return <Redirect href="/(tabs)/dashboard" />;
  } else {
    return <Redirect href="/(tabs)/assigned-faults" />;
  }
}
