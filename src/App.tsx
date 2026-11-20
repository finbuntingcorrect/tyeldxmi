import { Home } from './components/Home';
import { RouteProvider } from './hooks/useRoute';

export default function App() {
  return (
    <RouteProvider>
      <Home />
    </RouteProvider>
  );
}
