'use client';

import { useState, useEffect, useCallback } from 'react';
import { CHARACTERS } from '@/lib/characters';
import { useAuth } from '@/lib/auth/auth-context';
import { getBrowserClient } from '@/lib/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProfileData {
  displayName: string;
  avatarUrl: string;
  favoriteCharacterId: string;
}

interface LocalPreferences {
  autoPlayVoice: boolean;
  showImages: boolean;
  compactMode: boolean;
}

const DEFAULT_PREFS: LocalPreferences = {
  autoPlayVoice: true,
  showImages: true,
  compactMode: false,
};

function loadPrefs(): LocalPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem('user-preferences');
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PREFS;
}

function savePrefs(prefs: LocalPreferences) {
  localStorage.setItem('user-preferences', JSON.stringify(prefs));
}

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdate?: (profile: ProfileData) => void;
}

export function SettingsSheet({ open, onOpenChange, onProfileUpdate }: SettingsSheetProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    displayName: '',
    avatarUrl: '',
    favoriteCharacterId: '',
  });
  const [prefs, setPrefs] = useState<LocalPreferences>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load profile from API
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = getBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/profile', {
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setProfile({
            displayName: data.profile?.displayName ?? '',
            avatarUrl: data.profile?.avatarUrl ?? '',
            favoriteCharacterId: data.profile?.favoriteCharacterId ?? '',
          });
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, user]);

  // Load local preferences
  useEffect(() => {
    if (open) setPrefs(loadPrefs());
  }, [open]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          displayName: profile.displayName || undefined,
          favoriteCharacterId: profile.favoriteCharacterId || undefined,
          avatarUrl: profile.avatarUrl || undefined,
        }),
      });
      if (res.ok) {
        savePrefs(prefs);
        onProfileUpdate?.(profile);
        toast('设置已保存');
        onOpenChange(false);
      } else {
        toast('保存失败，请重试');
      }
    } catch {
      toast('网络错误，请重试');
    } finally {
      setSaving(false);
    }
  }, [profile, prefs, onProfileUpdate, onOpenChange]);

  const updatePref = (key: keyof LocalPreferences, value: boolean) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[360px] sm:max-w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">个人设置</SheetTitle>
          <SheetDescription>管理你的资料和偏好</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-4 pb-6 space-y-6">
            {/* Profile Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500">个人资料</h3>

              <div className="space-y-2">
                <Label htmlFor="displayName">昵称</Label>
                <Input
                  id="displayName"
                  value={profile.displayName}
                  onChange={e => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="输入你的昵称"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label>喜欢的角色</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CHARACTERS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setProfile(prev => ({
                        ...prev,
                        favoriteCharacterId: prev.favoriteCharacterId === c.id ? '' : c.id,
                      }))}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left',
                        profile.favoriteCharacterId === c.id
                          ? 'border-pink-400 bg-pink-50'
                          : 'border-gray-100 hover:border-gray-200'
                      )}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                        <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.name}</div>
                        <div className="text-xs text-gray-400 truncate">{c.title}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Preferences Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500">聊天偏好</h3>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">自动播放语音</div>
                  <div className="text-xs text-gray-400">收到回复后自动播放语音</div>
                </div>
                <Switch
                  checked={prefs.autoPlayVoice}
                  onCheckedChange={v => updatePref('autoPlayVoice', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">显示图片</div>
                  <div className="text-xs text-gray-400">在聊天中显示角色照片</div>
                </div>
                <Switch
                  checked={prefs.showImages}
                  onCheckedChange={v => updatePref('showImages', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">紧凑模式</div>
                  <div className="text-xs text-gray-400">减少消息间距</div>
                </div>
                <Switch
                  checked={prefs.compactMode}
                  onCheckedChange={v => updatePref('compactMode', v)}
                />
              </div>
            </div>

            <Separator />

            {/* Account Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500">账号信息</h3>
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                {user?.email ?? '未登录'}
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold"
            >
              {saving ? '保存中...' : '保存设置'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
