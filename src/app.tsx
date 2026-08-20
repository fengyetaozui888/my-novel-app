import { PropsWithChildren, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { LucideTaroProvider } from 'lucide-react-taro';
import '@/app.css';
import { Toaster } from '@/components/ui/toast';
import { Preset } from './presets';

const ACCESS_PASSWORD = '6602877';

const App = ({ children }: PropsWithChildren) => {
  useEffect(() => {
    const unlocked = Taro.getStorageSync('app_unlocked');
    if (unlocked) return;

    const overlay = document.createElement('div');
    overlay.id = 'app-splash-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#fce4ec 0%,#f8bbd0 50%,#f48fb1 100%);padding:48px 32px;';

    const title = document.createElement('div');
    title.textContent = '小世界';
    title.style.cssText = 'font-size:36px;font-weight:bold;color:#1a1a2e;margin-bottom:8px;';

    const subtitle = document.createElement('div');
    subtitle.textContent = '输入密码进入应用';
    subtitle.style.cssText = 'font-size:14px;color:#666;margin-bottom:32px;';

    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = '请输入密码';
    input.style.cssText = 'width:240px;height:48px;border-radius:24px;border:2px solid #f48fb1;padding:0 20px;font-size:16px;text-align:center;outline:none;background:#fff;margin-bottom:16px;';

    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = 'font-size:13px;color:#e53e3e;margin-bottom:12px;min-height:20px;';

    const btn = document.createElement('button');
    btn.textContent = '确认';
    btn.style.cssText = 'width:240px;height:48px;border-radius:24px;border:none;background:#e91e63;color:#fff;font-size:16px;font-weight:bold;cursor:pointer;';

    const footer = document.createElement('div');
    footer.textContent = '忘记密码请联系管理员';
    footer.style.cssText = 'font-size:12px;color:#999;margin-top:24px;';

    overlay.appendChild(title);
    overlay.appendChild(subtitle);
    overlay.appendChild(input);
    overlay.appendChild(errorMsg);
    overlay.appendChild(btn);
    overlay.appendChild(footer);
    document.body.appendChild(overlay);
    input.focus();

    const doUnlock = () => {
      if (input.value === ACCESS_PASSWORD) {
        Taro.setStorageSync('app_unlocked', '1');
        document.body.removeChild(overlay);
      } else {
        errorMsg.textContent = '密码错误，请重试';
        input.value = '';
        input.focus();
      }
    };

    btn.addEventListener('click', doUnlock);
    input.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') doUnlock(); });

    return () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); };
  }, []);

  return (
    <LucideTaroProvider defaultColor="#000" defaultSize={24}>
      <Preset>{children}</Preset>
      <Toaster />
    </LucideTaroProvider>
  );
};

export default App;
