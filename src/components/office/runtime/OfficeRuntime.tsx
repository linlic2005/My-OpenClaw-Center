import { useEffect, useRef, useState } from 'react';
import {
  OFFICE_ASSET_PATHS,
  OFFICE_CANVAS_HEIGHT,
  OFFICE_CANVAS_WIDTH,
  OFFICE_LAYOUT,
  OFFICE_STATE_BUBBLES,
  OFFICE_STATE_LABELS,
  type OfficeRuntimePayload,
  type OfficeVisualState,
} from './officeSceneConfig';
import { ensurePhaserRuntime } from './loadPhaser';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OfficeRuntimeProps {
  payload: OfficeRuntimePayload;
  onAgentSelect: (agentId: string | null) => void;
}

interface OfficeRuntimeApi {
  update: (payload: OfficeRuntimePayload) => void;
  destroy: () => void;
}

interface AgentVisual {
  container: any;
  body: any;
  frame: any;
  nameText: any;
  statusText: any;
  bubbleBg: any;
  bubbleText: any;
  selectionRing: any;
}

interface RuntimeVisuals {
  scene?: any;
  plaqueText?: any;
  mascotIdle?: any;
  mascotWorking?: any;
  serverroom?: any;
  syncAnim?: any;
  errorBug?: any;
  errorBugDir?: number;
  cat?: any;
  poster?: any;
  flower?: any;
  plants: any[];
  statusText?: any;
  bubble?: any;
  catBubble?: any;
  agentVisuals: Map<string, AgentVisual>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ROBOT_TEXTURE_BY_STATE: Record<OfficeVisualState, string> = {
  idle: 'robotIdle',
  writing: 'robotWorking',
  syncing: 'robotWorking',
  error: 'robotSleeping',
  offline: 'robotSleeping',
};

const BUBBLE_INTERVAL = 6400;
const CAT_BUBBLE_INTERVAL = 14400;
const CAT_BUBBLES = [
  '喵~', '咕噜咕噜…', '尾巴摇一摇', '晒太阳最开心',
  '有人来看我啦', '我是这个办公室的吉祥物', '伸个懒腰',
  '今天的罐罐准备好了吗', '呼噜呼噜', '这个位置视野最好',
];

/* ------------------------------------------------------------------ */
/*  Phaser Scene Factory                                               */
/* ------------------------------------------------------------------ */

function createOfficeRuntime(
  mountNode: HTMLDivElement,
  initialPayload: OfficeRuntimePayload,
  onAgentSelect: (agentId: string | null) => void,
): OfficeRuntimeApi {
  const Phaser = window.Phaser;
  const payloadRef: { current: OfficeRuntimePayload } = { current: initialPayload };
  const visuals: RuntimeVisuals = {
    agentVisuals: new Map(),
    plants: [],
  };

  let lastBubbleTime = 0;
  let lastCatBubbleTime = 0;

  /* ---------- helper: pick random from array ---------- */
  const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- show state bubble ---------- */
  const showBubble = (scene: any, time: number) => {
    if (visuals.bubble) { visuals.bubble.destroy(); visuals.bubble = null; }

    const state = payloadRef.current.officeState;
    if (state === 'idle') return;

    const texts = OFFICE_STATE_BUBBLES[state] || OFFICE_STATE_BUBBLES.idle;
    const text = pickRandom(texts);

    let anchorX: number, anchorY: number;
    if (state === 'syncing' && visuals.syncAnim?.visible) {
      anchorX = visuals.syncAnim.x; anchorY = visuals.syncAnim.y;
    } else if (state === 'error' && visuals.errorBug?.visible) {
      anchorX = visuals.errorBug.x; anchorY = visuals.errorBug.y;
    } else if (visuals.mascotWorking?.visible) {
      anchorX = visuals.mascotWorking.x; anchorY = visuals.mascotWorking.y;
    } else {
      anchorX = OFFICE_LAYOUT.starIdle.x; anchorY = OFFICE_LAYOUT.starIdle.y;
    }

    const bubbleY = anchorY - 70;
    const bg = scene.add.rectangle(anchorX, bubbleY, text.length * 11 + 24, 28, 0xffffff, 0.95);
    bg.setStrokeStyle(2, 0x0f172a, 0.7);
    bg.setDepth(1200);
    const txt = scene.add.text(anchorX, bubbleY, text, {
      fontFamily: 'ArkPixel, monospace', fontSize: '12px', color: '#0f172a', align: 'center',
    }).setOrigin(0.5).setDepth(1201);
    visuals.bubble = scene.add.container(0, 0, [bg, txt]).setDepth(1200);
    scene.time.delayedCall(2400, () => { if (visuals.bubble) { visuals.bubble.destroy(); visuals.bubble = null; } });
    lastBubbleTime = time;
  };

  /* ---------- show cat bubble ---------- */
  const showCatBubble = (scene: any, time: number) => {
    if (!visuals.cat) return;
    if (visuals.catBubble) { visuals.catBubble.destroy(); visuals.catBubble = null; }

    const text = pickRandom(CAT_BUBBLES);
    const anchorX = visuals.cat.x;
    const anchorY = visuals.cat.y - 60;
    const bg = scene.add.rectangle(anchorX, anchorY, text.length * 11 + 20, 24, 0xfffbeb, 0.95);
    bg.setStrokeStyle(2, 0xd4a574);
    bg.setDepth(2100);
    const txt = scene.add.text(anchorX, anchorY, text, {
      fontFamily: 'ArkPixel, monospace', fontSize: '11px', color: '#8b6914', align: 'center',
    }).setOrigin(0.5).setDepth(2101);
    visuals.catBubble = scene.add.container(0, 0, [bg, txt]).setDepth(2100);
    scene.time.delayedCall(3200, () => { if (visuals.catBubble) { visuals.catBubble.destroy(); visuals.catBubble = null; } });
    lastCatBubbleTime = time;
  };

  /* ---------- sync ambient state ---------- */
  const syncAmbientState = () => {
    const officeState = payloadRef.current.officeState;
    const statusLine = [
      `ROOM ${payloadRef.current.roomName.toUpperCase()}`,
      `STATE ${OFFICE_STATE_LABELS[officeState].toUpperCase()}`,
      `${payloadRef.current.agents.length} AGENTS ONLINE`,
    ].join('  •  ');

    visuals.statusText?.setText(statusLine);
    visuals.plaqueText?.setText(payloadRef.current.roomName);

    const isIdle = officeState === 'idle';
    const isSyncing = officeState === 'syncing';
    const isError = officeState === 'error';

    // Mascot idle (visible only when idle)
    visuals.mascotIdle?.setVisible(isIdle);

    // Mascot working (visible when writing)
    if (visuals.mascotWorking) {
      const showWorking = !isIdle && !isSyncing && !isError;
      visuals.mascotWorking.setVisible(showWorking);
      if (showWorking) {
        visuals.mascotWorking.anims.play('office-star-working', true);
      } else {
        visuals.mascotWorking.anims.stop();
        visuals.mascotWorking.setFrame(0);
      }
    }

    // Server room lights
    if (visuals.serverroom) {
      if (isIdle) {
        visuals.serverroom.anims.stop();
        visuals.serverroom.setFrame(0);
      } else {
        visuals.serverroom.anims.play('office-serverroom', true);
      }
    }

    // Sync animation
    if (visuals.syncAnim) {
      visuals.syncAnim.setVisible(isSyncing);
      if (isSyncing) {
        visuals.syncAnim.anims.play('office-sync', true);
      } else {
        visuals.syncAnim.anims.stop();
        visuals.syncAnim.setFrame(0);
      }
    }

    // Error bug
    if (visuals.errorBug) {
      visuals.errorBug.setVisible(isError);
      if (isError) {
        visuals.errorBug.anims.play('office-error-bug', true);
      } else {
        visuals.errorBug.anims.stop();
        visuals.errorBug.setFrame(0);
      }
    }
  };

  /* ---------- sync agent sprites ---------- */
  const syncAgents = () => {
    const scene = visuals.scene;
    if (!scene) return;

    const nextAgents = payloadRef.current.agents;
    const nextIds = new Set(nextAgents.map((a) => a.id));

    // Remove agents no longer present
    for (const [agentId, visual] of visuals.agentVisuals.entries()) {
      if (!nextIds.has(agentId)) {
        visual.container.destroy(true);
        visuals.agentVisuals.delete(agentId);
      }
    }

    // Create / update each agent
    nextAgents.forEach((agent) => {
      const bubbleTexts = OFFICE_STATE_BUBBLES[agent.state] || OFFICE_STATE_BUBBLES.idle;
      const bubbleText = bubbleTexts[agent.roleIndex % bubbleTexts.length];
      const tintColor = agent.isStreaming
        ? 0x22c55e
        : agent.state === 'error' ? 0xef4444
        : agent.state === 'offline' ? 0x64748b
        : 0x38bdf8;

      let visual = visuals.agentVisuals.get(agent.id);

      if (!visual) {
        const container = scene.add.container(agent.position.x, agent.position.y);
        container.setSize(150, 160);
        container.setInteractive(
          new Phaser.Geom.Rectangle(-75, -110, 150, 160),
          Phaser.Geom.Rectangle.Contains,
        );
        container.on('pointerdown', () => onAgentSelect(agent.id));

        const selectionRing = scene.add.circle(0, 2, 42, 0x22d3ee, 0.14);
        selectionRing.setStrokeStyle(2, 0x67e8f9, 0.9);
        selectionRing.setVisible(false);

        const frame = scene.add.circle(0, -26, 38, 0x0f172a, 0.72);
        frame.setStrokeStyle(2, 0x1e293b, 0.9);

        const body = scene.add.image(0, -28, ROBOT_TEXTURE_BY_STATE[agent.state]);
        body.setDisplaySize(84, 84);

        const nameText = scene.add.text(0, 56, agent.name, {
          fontFamily: 'ArkPixel, monospace', fontSize: '14px', color: '#e2e8f0',
          align: 'center', stroke: '#020617', strokeThickness: 3,
        }).setOrigin(0.5, 0.5);

        const statusText = scene.add.text(0, 78, OFFICE_STATE_LABELS[agent.state], {
          fontFamily: 'ArkPixel, monospace', fontSize: '11px', color: '#93c5fd', align: 'center',
        }).setOrigin(0.5, 0.5);

        const bubbleBg = scene.add.rectangle(0, -88, 136, 24, 0xf8fafc, 0.94);
        bubbleBg.setStrokeStyle(2, 0x0f172a, 0.7);

        const bubbleTextNode = scene.add.text(0, -88, bubbleText, {
          fontFamily: 'ArkPixel, monospace', fontSize: '10px', color: '#0f172a',
          align: 'center', wordWrap: { width: 122 },
        }).setOrigin(0.5, 0.5);

        container.add([selectionRing, frame, body, bubbleBg, bubbleTextNode, nameText, statusText]);
        container.setDepth(100);

        visual = { container, body, frame, nameText, statusText, bubbleBg, bubbleText: bubbleTextNode, selectionRing };
        visuals.agentVisuals.set(agent.id, visual);
      }

      // Update existing visual
      const alpha = agent.state === 'offline' ? 0.55 : 1;
      const statusColor = agent.state === 'error' ? '#fca5a5'
        : agent.isStreaming ? '#86efac'
        : agent.state === 'offline' ? '#94a3b8'
        : '#93c5fd';

      visual.container.setAlpha(alpha);
      visual.body.setTexture(ROBOT_TEXTURE_BY_STATE[agent.state]);
      visual.body.setTint(agent.state === 'offline' ? 0xbfc9d4 : 0xffffff);
      visual.frame.setFillStyle(tintColor, agent.isSelected ? 0.9 : 0.72);
      visual.frame.setStrokeStyle(agent.isSelected ? 3 : 2, tintColor, 0.95);
      visual.selectionRing.setVisible(agent.isSelected);
      visual.selectionRing.setFillStyle(agent.isStreaming ? 0x22c55e : 0x22d3ee, agent.isSelected ? 0.18 : 0.08);
      visual.selectionRing.setStrokeStyle(2, agent.isStreaming ? 0x86efac : 0x67e8f9, agent.isSelected ? 1 : 0.6);
      visual.nameText.setText(agent.name);
      visual.statusText.setText(OFFICE_STATE_LABELS[agent.state]);
      visual.statusText.setColor(statusColor);
      visual.bubbleText.setText(bubbleText);
      visual.bubbleBg.width = Math.max(112, visual.bubbleText.width + 20);
      visual.bubbleBg.setVisible(agent.isSelected || agent.isStreaming || agent.state === 'error');
      visual.bubbleText.setVisible(agent.isSelected || agent.isStreaming || agent.state === 'error');

      // Smooth tween movement
      scene.tweens.add({
        targets: visual.container,
        x: agent.position.x,
        y: agent.position.y,
        duration: 650,
        ease: 'Cubic.Out',
      });
    });
  };

  const applyPayload = () => {
    syncAmbientState();
    syncAgents();
  };

  /* ---------------------------------------------------------------- */
  /*  Phaser Scene                                                      */
  /* ---------------------------------------------------------------- */

  const sceneConfig = {
    preload(this: any) {
      this.load.image('office-background', payloadRef.current.roomBackground || OFFICE_ASSET_PATHS.roomBackground);
      this.load.image('office-sofa-idle', OFFICE_ASSET_PATHS.sofaIdle);
      this.load.spritesheet('office-coffee-machine', OFFICE_ASSET_PATHS.coffeeMachine, { frameWidth: 230, frameHeight: 230 });
      this.load.spritesheet('office-serverroom-sheet', OFFICE_ASSET_PATHS.serverroom, { frameWidth: 180, frameHeight: 251 });
      this.load.spritesheet('office-error-bug-sheet', OFFICE_ASSET_PATHS.errorBug, { frameWidth: 180, frameHeight: 180 });
      this.load.spritesheet('office-cat-sheet', OFFICE_ASSET_PATHS.cats, { frameWidth: 160, frameHeight: 160 });
      this.load.image('office-desk', OFFICE_ASSET_PATHS.desk);
      this.load.spritesheet('office-plants', OFFICE_ASSET_PATHS.plants, { frameWidth: 160, frameHeight: 160 });
      this.load.spritesheet('office-posters', OFFICE_ASSET_PATHS.posters, { frameWidth: 160, frameHeight: 160 });
      this.load.spritesheet('office-star-working-sheet', OFFICE_ASSET_PATHS.starWorking, { frameWidth: 230, frameHeight: 144 });
      this.load.spritesheet('office-sync-sheet', OFFICE_ASSET_PATHS.syncAnim, { frameWidth: 256, frameHeight: 256 });
      this.load.image('office-star-idle', OFFICE_ASSET_PATHS.starIdle);
      this.load.image('robotIdle', OFFICE_ASSET_PATHS.robotIdle);
      this.load.image('robotWorking', OFFICE_ASSET_PATHS.robotWorking);
      this.load.image('robotSleeping', OFFICE_ASSET_PATHS.robotSleeping);
    },

    create(this: any) {
      visuals.scene = this;

      // --- Background ---
      this.add.image(OFFICE_CANVAS_WIDTH / 2, OFFICE_CANVAS_HEIGHT / 2, 'office-background');

      // --- Poster ---
      const poster = this.add.sprite(OFFICE_LAYOUT.poster.x, OFFICE_LAYOUT.poster.y, 'office-posters', 0);
      poster.setDepth(4);

      // --- Plants ---
      const plantPositions = [
        { x: 565, y: 178 },
        { x: 230, y: 185 },
        { x: 977, y: 496 },
      ];
      const plants: any[] = [];
      plantPositions.forEach((pos) => {
        const plant = this.add.sprite(pos.x, pos.y, 'office-plants', 0);
        plant.setDepth(4);
        plants.push(plant);
      });

      // --- Sofa ---
      this.add.image(OFFICE_LAYOUT.sofa.x, OFFICE_LAYOUT.sofa.y, 'office-sofa-idle').setOrigin(0, 0).setDepth(10);

      // --- Coffee machine (animated loop) ---
      this.anims.create({
        key: 'office-coffee-machine',
        frames: this.anims.generateFrameNumbers('office-coffee-machine', { start: 0, end: 95 }),
        frameRate: 12, repeat: -1,
      });
      const coffeeMachine = this.add.sprite(OFFICE_LAYOUT.coffeeMachine.x, OFFICE_LAYOUT.coffeeMachine.y, 'office-coffee-machine', 0);
      coffeeMachine.setDepth(99);
      coffeeMachine.anims.play('office-coffee-machine', true);

      // --- Server room ---
      this.anims.create({
        key: 'office-serverroom',
        frames: this.anims.generateFrameNumbers('office-serverroom-sheet', { start: 0, end: 39 }),
        frameRate: 6, repeat: -1,
      });
      const serverroom = this.add.sprite(OFFICE_LAYOUT.serverroom.x, OFFICE_LAYOUT.serverroom.y, 'office-serverroom-sheet', 0);
      serverroom.setDepth(2);

      // --- Desk ---
      this.add.image(OFFICE_LAYOUT.desk.x, OFFICE_LAYOUT.desk.y, 'office-desk').setDepth(1000);

      // --- Flowers ---
      const flower = this.add.sprite(OFFICE_LAYOUT.flowers.x, OFFICE_LAYOUT.flowers.y, 'office-plants', 0);
      flower.setScale(0.8).setDepth(1100);

      // --- Star idle mascot ---
      const mascotIdle = this.add.image(OFFICE_LAYOUT.starIdle.x, OFFICE_LAYOUT.starIdle.y, 'office-star-idle');
      mascotIdle.setDisplaySize(112, 112).setDepth(20);

      // --- Star working mascot ---
      this.anims.create({
        key: 'office-star-working',
        frames: this.anims.generateFrameNumbers('office-star-working-sheet', { start: 0, end: 191 }),
        frameRate: 12, repeat: -1,
      });
      const mascotWorking = this.add.sprite(OFFICE_LAYOUT.starWorking.x, OFFICE_LAYOUT.starWorking.y, 'office-star-working-sheet', 0);
      mascotWorking.setDepth(900).setScale(1.32);

      // --- Error bug ---
      this.anims.create({
        key: 'office-error-bug',
        frames: this.anims.generateFrameNumbers('office-error-bug-sheet', { start: 0, end: 95 }),
        frameRate: 12, repeat: -1,
      });
      const errorBug = this.add.sprite(OFFICE_LAYOUT.errorBug.x, OFFICE_LAYOUT.errorBug.y, 'office-error-bug-sheet', 0);
      errorBug.setDepth(50).setScale(0.9);

      // --- Sync animation ---
      this.anims.create({
        key: 'office-sync',
        frames: this.anims.generateFrameNumbers('office-sync-sheet', { start: 1, end: 52 }),
        frameRate: 12, repeat: -1,
      });
      const syncAnim = this.add.sprite(OFFICE_LAYOUT.syncAnim.x, OFFICE_LAYOUT.syncAnim.y, 'office-sync-sheet', 0);
      syncAnim.setDepth(40);

      // --- Cat ---
      const cat = this.add.sprite(OFFICE_LAYOUT.cat.x, OFFICE_LAYOUT.cat.y, 'office-cat-sheet', 0);
      cat.setDepth(2000);

      // --- Plaque ---
      const plaqueBg = this.add.rectangle(OFFICE_LAYOUT.plaque.x, OFFICE_LAYOUT.plaque.y, 460, 38, 0x241f4f, 0.9);
      plaqueBg.setStrokeStyle(2, 0x7c3aed, 0.95).setDepth(90);

      const plaqueText = this.add.text(OFFICE_LAYOUT.plaque.x, OFFICE_LAYOUT.plaque.y, payloadRef.current.roomName, {
        fontFamily: 'ArkPixel, monospace', fontSize: '16px', color: '#fef08a',
        stroke: '#020617', strokeThickness: 3,
      }).setOrigin(0.5, 0.5).setDepth(91);

      // --- Status bar ---
      const statusPanel = this.add.rectangle(OFFICE_CANVAS_WIDTH / 2, 26, 840, 28, 0x020617, 0.72);
      statusPanel.setStrokeStyle(1, 0x334155, 0.95).setDepth(90);

      const statusText = this.add.text(OFFICE_CANVAS_WIDTH / 2, 26, '', {
        fontFamily: 'ArkPixel, monospace', fontSize: '12px', color: '#dbeafe',
      }).setOrigin(0.5, 0.5).setDepth(91);

      // --- Store references ---
      visuals.plaqueText = plaqueText;
      visuals.mascotIdle = mascotIdle;
      visuals.mascotWorking = mascotWorking;
      visuals.serverroom = serverroom;
      visuals.syncAnim = syncAnim;
      visuals.errorBug = errorBug;
      visuals.errorBugDir = 1;
      visuals.cat = cat;
      visuals.poster = poster;
      visuals.plants = plants;
      visuals.flower = flower;
      visuals.statusText = statusText;

      applyPayload();
    },

    update(this: any, time: number) {
      // Mascot idle float
      if (visuals.mascotIdle) {
        visuals.mascotIdle.y = OFFICE_LAYOUT.starIdle.y + Math.sin(time / 380) * 4;
      }

      // Cat float
      if (visuals.cat) {
        visuals.cat.y = OFFICE_LAYOUT.cat.y + Math.sin(time / 600) * 3;
      }

      // Error bug ping-pong
      if (visuals.errorBug?.visible) {
        const leftX = 1007;
        const rightX = 1111;
        const speed = 0.6;
        const dir = visuals.errorBugDir || 1;
        visuals.errorBug.x += speed * dir;
        visuals.errorBug.y = OFFICE_LAYOUT.errorBug.y;
        if (visuals.errorBug.x >= rightX) {
          visuals.errorBug.x = rightX;
          visuals.errorBugDir = -1;
        } else if (visuals.errorBug.x <= leftX) {
          visuals.errorBug.x = leftX;
          visuals.errorBugDir = 1;
        }
      }

      // State bubble (every 8s, only when not idle)
      if (time - lastBubbleTime > BUBBLE_INTERVAL) {
        showBubble(this, time);
      }

      // Cat bubble (every 18s)
      if (time - lastCatBubbleTime > CAT_BUBBLE_INTERVAL) {
        showCatBubble(this, time);
      }
    },
  };

  /* ---------------------------------------------------------------- */
  /*  Game instance                                                     */
  /* ---------------------------------------------------------------- */

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: OFFICE_CANVAS_WIDTH,
    height: OFFICE_CANVAS_HEIGHT,
    parent: mountNode,
    transparent: true,
    pixelArt: true,
    backgroundColor: '#090914',
    scene: sceneConfig,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });

  return {
    update(nextPayload) {
      payloadRef.current = nextPayload;
      applyPayload();
    },
    destroy() {
      game.destroy(true);
    },
  };
}

/* ------------------------------------------------------------------ */
/*  React component                                                    */
/* ------------------------------------------------------------------ */

export function OfficeRuntime({ payload, onAgentSelect }: OfficeRuntimeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<OfficeRuntimeApi | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const mount = async () => {
      if (!mountRef.current) return;

      try {
        await ensurePhaserRuntime();
        if (!isMounted || !mountRef.current) return;

        runtimeRef.current = createOfficeRuntime(mountRef.current, payload, onAgentSelect);
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize office runtime:', error);
        if (isMounted) setLoadError('Failed to initialize office runtime.');
      }
    };

    void mount();

    return () => {
      isMounted = false;
      runtimeRef.current?.destroy();
      runtimeRef.current = null;
    };
  }, [onAgentSelect]);

  useEffect(() => {
    runtimeRef.current?.update(payload);
  }, [payload]);

  return (
    <div className="office-canvas-shell relative overflow-hidden rounded-[28px] border border-white/10 bg-[#090914] shadow-[0_40px_120px_rgba(4,6,20,0.55)]">
      {!isReady && !loadError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.12),_transparent_50%),linear-gradient(180deg,_#111827_0%,_#090914_100%)]">
          <div className="h-10 w-10 rounded-full border-2 border-cyan-300/80 border-t-transparent animate-spin" />
          <p className="font-['ArkPixel',monospace] text-xs uppercase tracking-[0.35em] text-slate-300">
            Loading Office Runtime
          </p>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#090914]/90 p-6 text-center">
          <p className="font-['ArkPixel',monospace] text-sm text-rose-200">{loadError}</p>
        </div>
      )}
      <div
        ref={mountRef}
        className="relative aspect-[16/9] w-full min-h-[320px] bg-[#090914]"
        style={{ maxWidth: `${OFFICE_CANVAS_WIDTH}px` }}
      />
    </div>
  );
}
