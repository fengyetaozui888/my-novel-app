import { PropsWithChildren } from 'react';
import { LucideTaroProvider } from 'lucide-react-taro';
import PasswordGate from '@/components/PasswordGate';
import { Toaster } from '@/components/ui/toast';
import '@/app.css';
import { Preset } from './presets';

const App = ({ children }: PropsWithChildren) => {
  return (
    <LucideTaroProvider defaultColor="#000" defaultSize={24}>
      <PasswordGate />
      <Preset>{children}</Preset>
      <Toaster />
    </LucideTaroProvider>
  );
};

export default App;
