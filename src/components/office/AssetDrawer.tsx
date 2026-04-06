import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Lock, Upload, RotateCcw, Star, Trash2, Download, Copy,
  ImagePlus, CheckCircle2,
} from 'lucide-react';
import { apiClient, getAccessToken, API_BASE_URL } from '@/services/api-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AssetItem {
  path: string;
  size: number;
  ext: string;
  mtime: string;
}

interface FavoriteItem {
  id: string;
  path: string;
  createdAt: string;
}

interface AssetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBackgroundChanged?: () => void;
}

// Decoration session header
const SESSION_KEY = 'openclaw-decoration-session';
function getDecorationSession(): string {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function decorationHeaders() {
  return { 'x-decoration-session': getDecorationSession() };
}

/* ------------------------------------------------------------------ */
/*  Recommended prompts for web-based generation                       */
/* ------------------------------------------------------------------ */

const RECOMMENDED_PROMPTS = [
  {
    label: '🏠 像素风温馨办公室',
    prompt: 'A cozy pixel-art RPG-style office room, top-down 3/4 perspective, 1280x720, warm lighting, wooden floor, bookshelves, plants, desk area on the left, lounge area in the center, server room on the right, soft color palette, no characters, game asset style.',
  },
  {
    label: '🌊 海洋主题办公室',
    prompt: 'A pixel-art RPG-style underwater-themed office, top-down 3/4 perspective, 1280x720, blue-green ocean tones, coral decorations, bubble effects, sandy floor, aquarium walls, desk area left, lounge center, server room right, no characters.',
  },
  {
    label: '🌸 樱花日式办公室',
    prompt: 'A pixel-art RPG-style Japanese-themed office room, top-down 3/4 perspective, 1280x720, cherry blossom pink accents, tatami floor, sliding doors, bonsai trees, lanterns, desk area left, zen lounge center, tech corner right, no characters.',
  },
  {
    label: '🚀 赛博朋克办公室',
    prompt: 'A pixel-art RPG-style cyberpunk office room, top-down 3/4 perspective, 1280x720, neon purple and cyan lighting, holographic screens, dark metallic floor, futuristic furniture, hacking desk left, neon lounge center, server farm right, no characters.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AssetDrawer({ isOpen, onClose, onBackgroundChanged }: AssetDrawerProps) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<'decorate' | 'assets' | 'favorites'>('decorate');

  // Assets
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // Background upload
  const bgFileRef = useRef<HTMLInputElement>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const [bgResult, setBgResult] = useState<string | null>(null);

  // Prompt copy feedback
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Check auth status on open
  useEffect(() => {
    if (!isOpen) return;
    apiClient.get('/office/decoration/auth/status', { headers: decorationHeaders() })
      .then((res) => setAuthed(res.data.data.authed))
      .catch(() => setAuthed(false));
  }, [isOpen]);

  // Load data when authed
  useEffect(() => {
    if (!authed) return;
    loadAssets();
    loadFavorites();
  }, [authed]);

  const loadAssets = useCallback(async () => {
    try {
      const res = await apiClient.get('/office/decoration/assets', { headers: decorationHeaders() });
      setAssets(res.data.data);
    } catch { /* ignore */ }
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const res = await apiClient.get('/office/decoration/favorites', { headers: decorationHeaders() });
      setFavorites(res.data.data);
    } catch { /* ignore */ }
  }, []);

  const handleAuth = async () => {
    setAuthError('');
    try {
      await apiClient.post('/office/decoration/auth', { password }, { headers: decorationHeaders() });
      setAuthed(true);
    } catch {
      setAuthError('验证码错误');
    }
  };

  const handleCopyPrompt = (prompt: string, idx: number) => {
    navigator.clipboard.writeText(prompt);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/office/decoration/template`, {
        headers: {
          ...decorationHeaders(),
          ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        },
      });
      if (!res.ok) throw new Error('下载失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'room-reference.webp';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Template download failed:', e);
    }
  };

  const handleBgUpload = async () => {
    const file = bgFileRef.current?.files?.[0];
    if (!file) return;
    setBgUploading(true);
    setBgResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      await apiClient.post('/office/decoration/background/upload', form, {
        headers: { ...decorationHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      setBgResult('背景已替换！刷新页面即可看到效果。');
      onBackgroundChanged?.();
    } catch {
      setBgResult('上传失败，请重试。');
    } finally {
      setBgUploading(false);
      if (bgFileRef.current) bgFileRef.current.value = '';
    }
  };

  const handleSaveFavorite = async () => {
    try {
      await apiClient.post('/office/decoration/favorites', {}, { headers: decorationHeaders() });
      await loadFavorites();
    } catch { /* ignore */ }
  };

  const handleApplyFavorite = async (id: string) => {
    try {
      await apiClient.post('/office/decoration/favorites/apply', { id }, { headers: decorationHeaders() });
      onBackgroundChanged?.();
    } catch { /* ignore */ }
  };

  const handleDeleteFavorite = async (id: string) => {
    try {
      await apiClient.delete('/office/decoration/favorites', { data: { id }, headers: decorationHeaders() });
      await loadFavorites();
    } catch { /* ignore */ }
  };

  const handleRestoreRef = async () => {
    try {
      await apiClient.post('/office/decoration/restore-reference-bg', {}, { headers: decorationHeaders() });
      onBackgroundChanged?.();
    } catch { /* ignore */ }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-[90] flex h-full w-full max-w-[420px] flex-col border-l border-white/10 bg-[#0b1020]/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="font-['ArkPixel',monospace] text-sm uppercase tracking-[0.28em] text-cyan-100">
            🎨 装修工坊
          </h2>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {!authed ? (
            /* ---------- Auth gate ---------- */
            <div className="flex flex-col items-center gap-6 p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10">
                <Lock size={28} className="text-cyan-200" />
              </div>
              <p className="text-center text-sm text-slate-300">
                输入验证码以进入装修工坊
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                placeholder="验证码"
                className="w-full rounded-2xl border border-white/10 bg-[#111a2d] px-4 py-3 text-center text-sm text-white outline-none transition focus:border-cyan-300/40"
              />
              {authError && <p className="text-xs text-rose-300">{authError}</p>}
              <button
                onClick={handleAuth}
                className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                进入
              </button>
            </div>
          ) : (
            <>
              {/* ---------- Tabs ---------- */}
              <div className="flex border-b border-white/10">
                {(['decorate', 'assets', 'favorites'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={[
                      'flex-1 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition',
                      activeTab === tab
                        ? 'border-b-2 border-cyan-300 text-cyan-100'
                        : 'text-slate-500 hover:text-slate-300',
                    ].join(' ')}
                  >
                    {tab === 'decorate' ? '装修' : tab === 'assets' ? '素材' : '收藏'}
                  </button>
                ))}
              </div>

              {/* ---------- Decorate tab ---------- */}
              {activeTab === 'decorate' && (
                <div className="space-y-6 p-5">
                  {/* Step 1: Download template */}
                  <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                      <Download size={16} className="text-cyan-200" />
                      第一步：下载参考模板
                    </h3>
                    <p className="mb-3 text-xs text-slate-400">
                      下载房间结构参考图，在网页版 Gemini（Nano Banana / Flow）中与 Prompt 一起提交，可以保持房间布局一致。
                    </p>
                    <button
                      onClick={handleDownloadTemplate}
                      className="w-full rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
                    >
                      📥 下载 room-reference.webp
                    </button>
                  </section>

                  {/* Step 2: Copy prompt */}
                  <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                      <Copy size={16} className="text-cyan-200" />
                      第二步：选择 & 复制 Prompt
                    </h3>
                    <p className="mb-3 text-xs text-slate-400">
                      复制推荐 Prompt 后，到网页版 Gemini 粘贴并附上参考图来生成新背景。
                    </p>
                    <div className="space-y-2">
                      {RECOMMENDED_PROMPTS.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => handleCopyPrompt(p.prompt, i)}
                          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#111a2d] px-3 py-2.5 text-left text-xs text-slate-200 transition hover:border-cyan-300/30 hover:bg-[#151f35]"
                        >
                          <span>{p.label}</span>
                          {copiedIdx === i ? (
                            <CheckCircle2 size={14} className="shrink-0 text-green-400" />
                          ) : (
                            <Copy size={14} className="shrink-0 text-slate-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Step 3: Upload result */}
                  <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                      <ImagePlus size={16} className="text-cyan-200" />
                      第三步：上传生成的背景
                    </h3>
                    <p className="mb-3 text-xs text-slate-400">
                      将 Gemini 生成的图片保存后上传到这里，背景会立即替换。推荐 1280×720 像素的 WebP/PNG 图片。
                    </p>
                    <input
                      ref={bgFileRef}
                      type="file"
                      accept=".webp,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={handleBgUpload}
                    />
                    <button
                      onClick={() => bgFileRef.current?.click()}
                      disabled={bgUploading}
                      className="w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {bgUploading ? '上传中...' : '📤 选择图片并上传'}
                    </button>
                    {bgResult && (
                      <p className={`mt-2 text-xs ${bgResult.includes('失败') ? 'text-rose-300' : 'text-green-300'}`}>
                        {bgResult}
                      </p>
                    )}
                  </section>

                  {/* Extra actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleRestoreRef}
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                    >
                      <RotateCcw size={14} className="mr-1.5 inline" />
                      恢复默认底图
                    </button>
                    <button
                      onClick={handleSaveFavorite}
                      className="flex-1 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/15"
                    >
                      <Star size={14} className="mr-1.5 inline" />
                      收藏当前地图
                    </button>
                  </div>
                </div>
              )}

              {/* ---------- Assets tab ---------- */}
              {activeTab === 'assets' && (
                <div className="space-y-2 p-5">
                  <p className="mb-3 text-xs text-slate-400">
                    所有可替换的办公室美术素材。点击可上传替换。
                  </p>
                  {assets.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-6">暂无可替换素材</p>
                  ) : assets.map((asset) => (
                    <div
                      key={asset.path}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111a2d] px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-slate-200">{asset.path}</div>
                        <div className="text-[10px] text-slate-500">
                          {(asset.size / 1024).toFixed(1)} KB · {asset.ext}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1.5 ml-2">
                        <button
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.webp,.png,.jpg,.jpeg,.gif';
                            input.onchange = async () => {
                              const file = input.files?.[0];
                              if (!file) return;
                              const form = new FormData();
                              form.append('path', asset.path);
                              form.append('file', file);
                              try {
                                await apiClient.post('/office/decoration/assets/upload', form, {
                                  headers: { ...decorationHeaders(), 'Content-Type': 'multipart/form-data' },
                                });
                                await loadAssets();
                              } catch { /* ignore */ }
                            };
                            input.click();
                          }}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
                          title="替换"
                        >
                          <Upload size={14} />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await apiClient.post('/office/decoration/assets/restore-default', { path: asset.path }, { headers: decorationHeaders() });
                              await loadAssets();
                            } catch { /* ignore */ }
                          }}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-amber-200"
                          title="恢复默认"
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ---------- Favorites tab ---------- */}
              {activeTab === 'favorites' && (
                <div className="space-y-3 p-5">
                  <p className="mb-3 text-xs text-slate-400">
                    收藏过的背景地图。点击「应用」可一键切换。
                  </p>
                  {favorites.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-6">暂无收藏</p>
                  ) : favorites.map((fav) => (
                    <div
                      key={fav.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111a2d] px-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-200">{fav.id}</div>
                        <div className="text-[10px] text-slate-500">{new Date(fav.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="flex shrink-0 gap-1.5 ml-2">
                        <button
                          onClick={() => handleApplyFavorite(fav.id)}
                          className="rounded-lg bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                        >
                          应用
                        </button>
                        <button
                          onClick={() => handleDeleteFavorite(fav.id)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-rose-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
