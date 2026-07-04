import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/use-auth";
import Editor, { type OnMount } from "@monaco-editor/react";
import {
  Mic, MicOff, MessageSquare, Users, Play, X, Crown,
  ChevronLeft, Download, AlertTriangle, Clock, Check,
} from "lucide-react";

type Member = {
  userId: number;
  username: string;
  color: string;
  role: "host" | "member";
  canWrite: boolean;
  canRun: boolean;
  micEnabled: boolean;
  isOnline: boolean;
};

type ChatMsg = {
  userId: number;
  username: string;
  color: string;
  text: string;
  timestamp: string;
};

type RunOutput = {
  triggeredBy: number;
  triggeredByName: string;
  output: string;
  language: string;
  timestamp: string;
};

type FileMeta = { file_path: string; content: string; language: string };

type PendingRequest = { userId: number; username: string; color: string };

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const EXT_TO_LANG: Record<string, string> = {
  js: "javascript", ts: "typescript", py: "python",
  html: "html", css: "css", rs: "rust", go: "go",
  java: "java", cpp: "cpp", php: "php", json: "json",
  md: "markdown", sh: "shell", sql: "sql", c: "c",
};

function getMonacoLang(filePath: string) {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "plaintext";
}

function MemberItem({
  member, isMe, isHost, onPermChange, onKick, onTransfer,
}: {
  member: Member;
  isMe: boolean;
  isHost: boolean;
  onPermChange: (userId: number, field: "canWrite" | "canRun", val: boolean) => void;
  onKick: (userId: number) => void;
  onTransfer: (userId: number) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl group"
      style={{
        background: isMe ? `${member.color}10` : "rgba(255,255,255,0.02)",
        border: `1px solid ${isMe ? member.color + "30" : "rgba(255,255,255,0.05)"}`,
      }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0 transition-opacity"
        style={{
          background: member.color,
          boxShadow: `0 0 6px ${member.color}80`,
          opacity: member.isOnline ? 1 : 0.3,
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-white/80 truncate">{member.username}</span>
          {member.role === "host" && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
          {isMe && <span className="text-[10px] text-white/30">(أنا)</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[9px] px-1 rounded ${member.canWrite || member.role === "host" ? "text-emerald-400" : "text-white/20"}`}>
            {member.canWrite || member.role === "host" ? "✏️ كتابة" : "👁️ قراءة"}
          </span>
          {(member.canRun || member.role === "host") && (
            <span className="text-[9px] px-1 rounded text-blue-400">▶️ تشغيل</span>
          )}
          {member.micEnabled && <Mic className="w-2.5 h-2.5 text-emerald-400" />}
        </div>
      </div>
      {isHost && !isMe && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onPermChange(member.userId, "canWrite", !member.canWrite)}
            className="w-6 h-6 rounded flex items-center justify-center text-[9px] transition-colors hover:bg-white/10"
            style={{ color: member.canWrite ? "#10B981" : "rgba(255,255,255,0.3)" }}
            title={member.canWrite ? "سحب الكتابة" : "منح الكتابة"}
          >✏️</button>
          <button
            onClick={() => onPermChange(member.userId, "canRun", !member.canRun)}
            className="w-6 h-6 rounded flex items-center justify-center text-[9px] transition-colors hover:bg-white/10"
            style={{ color: member.canRun ? "#3B82F6" : "rgba(255,255,255,0.3)" }}
            title={member.canRun ? "سحب التشغيل" : "منح التشغيل"}
          >▶️</button>
          <button
            onClick={() => onTransfer(member.userId)}
            className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-amber-500/20"
            title="نقل الإشراف"
          ><Crown className="w-3 h-3 text-amber-400" /></button>
          <button
            onClick={() => onKick(member.userId)}
            className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-red-500/20"
            title="طرد"
          ><X className="w-3 h-3 text-red-400" /></button>
        </div>
      )}
    </div>
  );
}

function PendingBanner({
  requests, onAdmit, onReject,
}: {
  requests: PendingRequest[];
  onAdmit: (userId: number) => void;
  onReject: (userId: number) => void;
}) {
  if (requests.length === 0) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60 }} animate={{ y: 0 }} exit={{ y: -60 }}
        className="absolute top-0 left-0 right-0 z-30 flex flex-col gap-1 p-2"
        style={{ background: "rgba(245,158,11,0.12)", borderBottom: "1px solid rgba(245,158,11,0.25)" }}
      >
        {requests.map((r) => (
          <div key={r.userId} className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
            <span className="text-xs text-amber-300 flex-1 font-bold truncate">{r.username} يطلب الدخول</span>
            <button onClick={() => onAdmit(r.userId)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors hover:bg-emerald-500/20"
              style={{ color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>
              <Check className="w-3 h-3" /> قبول
            </button>
            <button onClick={() => onReject(r.userId)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors hover:bg-red-500/20"
              style={{ color: "#F87171", border: "1px solid rgba(239,68,68,0.3)" }}>
              <X className="w-3 h-3" /> رفض
            </button>
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

export default function CodingRoom() {
  const [match, params] = useRoute<{ roomId: string }>("/coding-room/:roomId");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const roomId = parseInt(params?.roomId ?? "", 10);

  const wsRef = useRef<WebSocket | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const peerRefs = useRef<Map<number, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myUserIdRef = useRef<number | undefined>(undefined);

  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [myInfo, setMyInfo] = useState<{ role: "host" | "member"; color: string; canWrite: boolean; canRun: boolean } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [activeFile, setActiveFile] = useState<string>("");
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [runOutputs, setRunOutputs] = useState<RunOutput[]>([]);
  const [chatText, setChatText] = useState("");
  const [micEnabled, setMicEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "error" | "waiting">("connecting");
  const [showChat, setShowChat] = useState(false);
  const [closingCountdown, setClosingCountdown] = useState<number | null>(null);
  const [newFile, setNewFile] = useState("");
  const [activeRightTab, setActiveRightTab] = useState<"output" | "preview">("output");
  const [previewHtml, setPreviewHtml] = useState("");
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeFileRef = useRef<string>("");
  const showChatRef = useRef(false);
  const myInfoRef = useRef<typeof myInfo>(null);
  const handleWsMsgRef = useRef<(raw: string) => void>(() => {});

  showChatRef.current = showChat;
  myInfoRef.current = myInfo;
  myUserIdRef.current = (user as any)?.id;

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  useEffect(() => {
    if (!showChat) return;
    setUnreadChat(0);
  }, [showChat]);

  const initWebRTC = useCallback(async (targetUserId: number, initiator: boolean) => {
    if (peerRefs.current.has(targetUserId)) return peerRefs.current.get(targetUserId) ?? null;

    try {
      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      peerRefs.current.set(targetUserId, pc);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
      } else {
        pc.addTransceiver("audio", { direction: "recvonly" });
      }

      pc.onicecandidate = (e) => {
        if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "webrtc_signal",
            targetUserId,
            signal: { type: "candidate", candidate: e.candidate },
          }));
        }
      };

      pc.ontrack = (e) => {
        let audio = document.querySelector(`audio[data-peer="${targetUserId}"]`) as HTMLAudioElement | null;
        if (!audio) {
          audio = document.createElement("audio");
          audio.setAttribute("data-peer", String(targetUserId));
          audio.autoplay = true;
          document.body.appendChild(audio);
        }
        audio.srcObject = e.streams[0];
      };

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        wsRef.current?.send(JSON.stringify({
          type: "webrtc_signal",
          targetUserId,
          signal: { type: "offer", sdp: offer },
        }));
      }
      return pc;
    } catch {
      return null;
    }
  }, []);

  const handleWebRTCSignal = useCallback(async (fromUserId: number, signal: any) => {
    try {
      let pc = peerRefs.current.get(fromUserId);
      if (!pc) {
        if (signal.type !== "offer") return;
        const newPc = await initWebRTC(fromUserId, false);
        if (!newPc) return;
        pc = newPc;
      }
      if (signal.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        wsRef.current?.send(JSON.stringify({
          type: "webrtc_signal",
          targetUserId: fromUserId,
          signal: { type: "answer", sdp: answer },
        }));
      } else if (signal.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === "candidate") {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch {}
  }, [initWebRTC]);

  const teardownPeer = useCallback((targetUserId: number) => {
    const pc = peerRefs.current.get(targetUserId);
    if (pc) {
      try { pc.close(); } catch {}
      peerRefs.current.delete(targetUserId);
    }
    document.querySelector(`audio[data-peer="${targetUserId}"]`)?.remove();
  }, []);

  const maybeConnectPeer = useCallback((targetUserId: number, targetHasMic: boolean) => {
    const myId = myUserIdRef.current;
    if (myId == null || targetUserId === myId) return;
    const iHaveMic = !!localStreamRef.current;
    if (!iHaveMic && !targetHasMic) return;
    if (peerRefs.current.has(targetUserId)) return;
    if (myId < targetUserId) {
      initWebRTC(targetUserId, true);
    }
  }, [initWebRTC]);

  const handleWsMessage = useCallback(async (raw: string) => {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }
    const myUserId = (user as any)?.id;

    switch (msg.type) {
      case "room_state": {
        const filesFromWs: FileMeta[] = msg.files ?? [];
        const membersFromWs: Member[] = msg.members ?? [];
        setMyInfo({ role: msg.role, color: msg.color, canWrite: msg.canWrite, canRun: msg.canRun });
        setMembers(membersFromWs);
        setFiles(filesFromWs);
        if (filesFromWs.length > 0) {
          setActiveFile((prev) => {
            const target = prev && filesFromWs.find((f) => f.file_path === prev) ? prev : filesFromWs[0].file_path;
            return target;
          });
        }
        if (msg.role === "host" && Array.isArray(msg.pending)) {
          setPendingRequests(msg.pending.map((p: any) => ({
            userId: p.userId, username: p.username, color: p.color ?? "#94A3B8",
          })));
        }
        for (const m of membersFromWs) {
          if (m.userId !== myUserId && m.isOnline && m.micEnabled) {
            maybeConnectPeer(m.userId, true);
          }
        }
        setWsStatus("connected");
        setConnected(true);
        break;
      }

      case "member_joined":
        setMembers(msg.members ?? []);
        if (msg.userId !== myUserId) {
          setChatMsgs((prev) => [...prev, {
            userId: -1, username: "النظام", color: "#64748B",
            text: `${msg.username} انضم للغرفة 👋`, timestamp: new Date().toISOString(),
          }]);
          if (!showChatRef.current) setUnreadChat((c) => c + 1);
          maybeConnectPeer(msg.userId, !!msg.micEnabled);
        }
        break;

      case "member_left":
        setMembers(msg.members ?? []);
        setChatMsgs((prev) => [...prev, {
          userId: -1, username: "النظام", color: "#64748B",
          text: `عضو ${msg.reason === "kicked" ? "طُرد من" : "غادر"} الغرفة`, timestamp: new Date().toISOString(),
        }]);
        if (!showChatRef.current) setUnreadChat((c) => c + 1);
        { const pc = peerRefs.current.get(msg.userId); if (pc) { pc.close(); peerRefs.current.delete(msg.userId); } }
        document.querySelector(`audio[data-peer="${msg.userId}"]`)?.remove();
        break;

      case "host_changed":
        setMembers(msg.members ?? []);
        if (msg.newHostUserId !== myUserIdRef.current) {
          setMyInfo((prev) => prev?.role === "host" ? { ...prev, role: "member", canWrite: false, canRun: false } : prev);
        }
        break;

      case "you_are_host":
        setMyInfo((prev) => prev ? { ...prev, role: "host", canWrite: true, canRun: true } : prev);
        setChatMsgs((prev) => [...prev, {
          userId: -1, username: "النظام", color: "#F59E0B",
          text: "👑 أنت الآن مشرف الغرفة", timestamp: new Date().toISOString(),
        }]);
        if (!showChatRef.current) setUnreadChat((c) => c + 1);
        break;

      case "permission_changed":
        setMembers(msg.members ?? []);
        if (msg.targetUserId === myUserId) {
          setMyInfo((prev) => prev ? { ...prev, canWrite: msg.canWrite, canRun: msg.canRun } : prev);
          setChatMsgs((prev) => [...prev, {
            userId: -1, username: "النظام", color: "#3B82F6",
            text: `تم ${msg.canWrite ? "منحك" : "سحب"} إذن الكتابة ${msg.canRun ? "والتشغيل" : ""}`.trim(),
            timestamp: new Date().toISOString(),
          }]);
          if (!showChatRef.current) setUnreadChat((c) => c + 1);
        }
        break;

      case "code_change":
        if (msg.userId !== myUserId) {
          const incomingFile: string = msg.file ?? "";
          const incomingContent: string = msg.fullContent ?? "";
          setFiles((prev) => prev.map((f) =>
            f.file_path === incomingFile ? { ...f, content: incomingContent } : f
          ));
          if (incomingFile === activeFileRef.current && editorRef.current) {
            const currentVal = editorRef.current.getValue();
            if (currentVal !== incomingContent) {
              const pos = editorRef.current.getPosition();
              isApplyingRemoteRef.current = true;
              try {
                editorRef.current.setValue(incomingContent);
                if (pos) editorRef.current.setPosition(pos);
              } finally {
                isApplyingRemoteRef.current = false;
              }
            }
          }
        }
        break;

      case "cursor_move":
        if (msg.userId !== myUserId && monacoRef.current && editorRef.current && msg.file === activeFileRef.current) {
          try {
            const color = msg.color ?? "#ffffff";
            const decorations = editorRef.current.createDecorationsCollection([{
              range: new monacoRef.current.Range(msg.line, msg.column, msg.line, msg.column + 1),
              options: {
                before: { content: "▏", color },
              },
            }]);
            setTimeout(() => decorations.clear(), 2000);
          } catch {}
        }
        break;

      case "file_created":
        setFiles((prev) => {
          if (prev.find((f) => f.file_path === msg.filePath)) return prev;
          return [...prev, { file_path: msg.filePath, content: msg.content ?? "", language: "" }];
        });
        if (msg.userId === myUserId) {
          setActiveFile(msg.filePath);
        }
        break;

      case "file_deleted":
        setFiles((prev) => {
          const remaining = prev.filter((f) => f.file_path !== msg.filePath);
          if (activeFileRef.current === msg.filePath) {
            const next = remaining[0]?.file_path ?? "";
            setActiveFile(next);
          }
          return remaining;
        });
        break;

      case "file_delete_request": {
        if (myInfoRef.current?.role === "host") {
          if (confirm(`${msg.username} يطلب حذف الملف: ${msg.filePath}\nهل توافق؟`)) {
            wsRef.current?.send(JSON.stringify({
              type: "file_delete_approve",
              filePath: msg.filePath,
              requestUserId: msg.userId,
            }));
          }
        }
        break;
      }

      case "join_request_pending":
        setPendingRequests((prev) => {
          if (prev.find((r) => r.userId === msg.userId)) return prev;
          return [...prev, { userId: msg.userId, username: msg.username, color: msg.color ?? "#94A3B8" }];
        });
        break;

      case "join_request_cancelled":
        setPendingRequests((prev) => prev.filter((r) => r.userId !== msg.userId));
        break;

      case "chat_message":
        setChatMsgs((prev) => [...prev, msg]);
        if (!showChatRef.current) setUnreadChat((c) => c + 1);
        break;

      case "run_output":
        setRunOutputs((prev) => [...prev, msg]);
        setActiveRightTab("output");
        setIsRunning(false);
        break;

      case "run_request":
        setChatMsgs((prev) => [...prev, {
          userId: -1, username: "النظام", color: "#64748B",
          text: `${msg.username} يطلب تشغيل الكود`, timestamp: new Date().toISOString(),
        }]);
        break;

      case "room_closing":
        setClosingCountdown(msg.countdown ?? 30);
        break;

      case "room_closed":
        navigate("/coding-rooms");
        break;

      case "kicked":
      case "rejected":
        alert(msg.message ?? "تم رفض دخولك أو طردك من الغرفة");
        navigate("/coding-rooms");
        break;

      case "waiting_approval":
        setWsStatus("waiting");
        break;

      case "mic_state":
        setMembers((prev) => prev.map((m) =>
          m.userId === msg.userId ? { ...m, micEnabled: !!msg.enabled } : m
        ));
        if (msg.userId !== myUserId) {
          teardownPeer(msg.userId);
          maybeConnectPeer(msg.userId, !!msg.enabled);
        }
        break;

      case "webrtc_signal":
        handleWebRTCSignal(msg.fromUserId, msg.signal);
        break;

      case "error":
        setChatMsgs((prev) => [...prev, {
          userId: -1, username: "خطأ", color: "#EF4444",
          text: msg.message ?? "حدث خطأ", timestamp: new Date().toISOString(),
        }]);
        if (!showChatRef.current) setUnreadChat((c) => c + 1);
        break;
    }
  }, [user, handleWebRTCSignal, navigate, maybeConnectPeer, teardownPeer]);

  handleWsMsgRef.current = handleWsMessage;

  useEffect(() => {
    if (!match || isNaN(roomId)) return;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/room/${roomId}`);
      wsRef.current = ws;
      ws.onopen = () => {
        if (!destroyed) setWsStatus("connecting");
      };
      ws.onmessage = (e) => handleWsMsgRef.current(e.data);
      ws.onerror = () => {
        if (!destroyed) {
          setWsStatus("error");
          setIsRunning(false);
        }
      };
      ws.onclose = (ev) => {
        if (destroyed) return;
        setIsRunning(false);
        if (ev.code === 1008 || ev.code === 1011) {
          setConnected(false);
          setWsStatus("error");
          return;
        }
        setConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close(1000, "leave");
      peerRefs.current.forEach((pc) => pc.close());
      peerRefs.current.clear();
      document.querySelectorAll("audio[data-peer]").forEach((el) => el.remove());
    };
  }, [match, roomId]);

  useEffect(() => {
    if (!match || isNaN(roomId)) return;
    fetch(`/api/coding-rooms/${roomId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.room) setRoomInfo(d.room); })
      .catch(() => {});
  }, [match, roomId]);

  useEffect(() => {
    if (!closingCountdown || closingCountdown <= 0) return;
    const t = setTimeout(() => setClosingCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [closingCountdown]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    if (!activeFile) return;
    const file = files.find((f) => f.file_path === activeFile);
    if (!file) return;
    const model = editorRef.current.getModel();
    if (model) {
      const current = model.getValue();
      if (current !== file.content) {
        if (sendTimerRef.current) {
          clearTimeout(sendTimerRef.current);
          sendTimerRef.current = null;
        }
        const pos = editorRef.current.getPosition();
        isApplyingRemoteRef.current = true;
        try {
          editorRef.current.pushUndoStop();
          model.setValue(file.content ?? "");
          editorRef.current.pushUndoStop();
          if (pos) editorRef.current.setPosition(pos);
        } finally {
          isApplyingRemoteRef.current = false;
        }
      }
      monacoRef.current.editor.setModelLanguage(model, getMonacoLang(activeFile));
    }
    const isEditable = !!(myInfo?.canWrite || myInfo?.role === "host");
    editorRef.current.updateOptions({ readOnly: !isEditable });
  }, [activeFile, myInfo]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme("nukhba-cyber", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "4B5563", fontStyle: "italic" },
        { token: "keyword", foreground: "10B981" },
        { token: "string", foreground: "F59E0B" },
        { token: "number", foreground: "3B82F6" },
        { token: "type", foreground: "A855F7" },
      ],
      colors: {
        "editor.background": "#060912",
        "editor.foreground": "#E5E7EB",
        "editorCursor.foreground": "#10B981",
        "editor.lineHighlightBackground": "#10B98108",
        "editorLineNumber.foreground": "#374151",
        "editorLineNumber.activeForeground": "#10B981",
        "editor.selectionBackground": "#10B98130",
      },
    });
    monaco.editor.setTheme("nukhba-cyber");

    editor.onDidChangeModelContent(() => {
      if (isApplyingRemoteRef.current) return;
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
      sendTimerRef.current = setTimeout(() => {
        const currentFile = activeFileRef.current;
        if (!currentFile) return;
        const content = editor.getValue();
        wsRef.current?.send(JSON.stringify({
          type: "code_change",
          file: currentFile,
          fullContent: content,
        }));
        setFiles((prev) => prev.map((f) => f.file_path === currentFile ? { ...f, content } : f));
      }, 200);
    });

    editor.onDidChangeCursorPosition((e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(JSON.stringify({
        type: "cursor_move",
        file: activeFileRef.current,
        line: e.position.lineNumber,
        column: e.position.column,
      }));
    });
  };

  const sendChat = () => {
    const text = chatText.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "chat_message", text }));
    setChatText("");
  };

  const toggleMic = async () => {
    if (micEnabled) {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setMicEnabled(false);
      wsRef.current?.send(JSON.stringify({ type: "mic_state", enabled: false }));
      peerRefs.current.forEach((pc) => pc.close());
      peerRefs.current.clear();
      document.querySelectorAll("audio[data-peer]").forEach((el) => el.remove());
      for (const m of members) {
        if (m.userId !== myUserIdRef.current && m.isOnline && m.micEnabled) {
          maybeConnectPeer(m.userId, true);
        }
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setMicEnabled(true);
        wsRef.current?.send(JSON.stringify({ type: "mic_state", enabled: true }));
        peerRefs.current.forEach((pc) => pc.close());
        peerRefs.current.clear();
        document.querySelectorAll("audio[data-peer]").forEach((el) => el.remove());
        for (const m of members) {
          if (m.userId !== myUserIdRef.current && m.isOnline) {
            maybeConnectPeer(m.userId, m.micEnabled);
          }
        }
      } catch {
        alert("تعذر الوصول إلى الميكروفون. تأكد من منح الإذن في المتصفح.");
      }
    }
  };

  const handlePermChange = (targetUserId: number, field: "canWrite" | "canRun", val: boolean) => {
    wsRef.current?.send(JSON.stringify({
      type: "permission_change",
      targetUserId,
      [field]: val,
    }));
  };

  const handleKick = (targetUserId: number) => {
    if (!confirm("هل تريد طرد هذا العضو؟")) return;
    wsRef.current?.send(JSON.stringify({ type: "kick_member", targetUserId }));
  };

  const handleTransfer = (targetUserId: number) => {
    if (!confirm("هل تريد نقل الإشراف لهذا العضو؟")) return;
    wsRef.current?.send(JSON.stringify({ type: "transfer_host", targetUserId }));
  };

  const handleCloseRoom = () => {
    if (!confirm("إغلاق الغرفة؟ سيُعطى المشتركون 30 ثانية لتحميل الكود.")) return;
    wsRef.current?.send(JSON.stringify({ type: "room_closing" }));
  };

  const handleLeave = () => {
    wsRef.current?.close(1000, "leave");
    fetch(`/api/coding-rooms/${roomId}/leave`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
    navigate("/coding-rooms");
  };

  const handleDownload = async () => {
    try {
      const r = await fetch(`/api/coding-rooms/${roomId}/download`, { credentials: "include" });
      const d = await r.json();
      const fileList: { file_path: string; content: string }[] = d.files ?? [];
      if (fileList.length === 0) { alert("لا توجد ملفات للتحميل"); return; }
      if (fileList.length === 1) {
        const blob = new Blob([fileList[0].content], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileList[0].file_path.split("/").pop() ?? "code.txt";
        a.click();
        URL.revokeObjectURL(a.href);
        return;
      }
      const combined = fileList.map((f) => `${"=".repeat(60)}\n${f.file_path}\n${"=".repeat(60)}\n${f.content}\n`).join("\n");
      const blob = new Blob([combined], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `room-${roomId}-code.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { alert("فشل التحميل"); }
  };

  const handleRunCode = async () => {
    if (!myInfo?.canRun && myInfo?.role !== "host") {
      wsRef.current?.send(JSON.stringify({ type: "run_code" }));
      return;
    }
    const currentFile = activeFileRef.current;
    const file = files.find((f) => f.file_path === currentFile);
    if (!file) { alert("اختر ملفاً أولاً"); return; }

    if (currentFile.endsWith(".html")) {
      setPreviewHtml(file.content);
      setActiveRightTab("preview");
      wsRef.current?.send(JSON.stringify({ type: "run_output", output: "✅ HTML preview shown", language: "html" }));
      return;
    }

    const ext = currentFile.split(".").pop()?.toLowerCase() ?? "";
    const langMap: Record<string, string> = {
      js: "javascript", py: "python", ts: "typescript",
      java: "java", cpp: "cpp", c: "c", rs: "rust",
    };
    const lang = langMap[ext] ?? "javascript";

    setIsRunning(true);
    try {
      const r = await fetch("/api/ai/run-code", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang, code: editorRef.current?.getValue() ?? file.content }),
      });
      const d = await r.json();
      wsRef.current?.send(JSON.stringify({
        type: "run_output",
        output: d.output ?? d.error ?? "⚠️ لا يوجد ناتج",
        language: lang,
      }));
    } catch {
      wsRef.current?.send(JSON.stringify({
        type: "run_output",
        output: "❌ خطأ في الاتصال بخادم التشغيل",
        language: lang,
      }));
      setIsRunning(false);
    }
  };

  const addNewFile = () => {
    const filePath = newFile.trim();
    if (!filePath) return;
    if (files.find((f) => f.file_path === filePath)) {
      setActiveFile(filePath);
      setNewFile("");
      return;
    }
    wsRef.current?.send(JSON.stringify({ type: "file_created", filePath, content: "" }));
    setNewFile("");
  };

  const handleAdmit = (targetUserId: number) => {
    wsRef.current?.send(JSON.stringify({ type: "admit_member", targetUserId }));
    setPendingRequests((prev) => prev.filter((r) => r.userId !== targetUserId));
  };

  const handleReject = (targetUserId: number) => {
    wsRef.current?.send(JSON.stringify({ type: "reject_member", targetUserId }));
    setPendingRequests((prev) => prev.filter((r) => r.userId !== targetUserId));
  };

  const myUserId = (user as any)?.id;

  if (!match) return null;

  if (wsStatus === "waiting") {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen" style={{ background: "hsl(222,28%,7%)" }} dir="rtl">
          <div className="text-center p-8 rounded-2xl max-w-sm w-full mx-4"
            style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-black text-white mb-2">بانتظار موافقة المشرف</h2>
            <p className="text-white/40 text-sm mb-6">سيُعلمك المشرف بقبول طلبك — انتظر في هذه الصفحة</p>
            <button
              onClick={() => navigate("/coding-rooms")}
              className="px-6 py-2 rounded-xl text-sm font-bold transition-all hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
            >
              العودة للغرف
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (wsStatus === "error" && !connected) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen" dir="rtl">
          <div className="text-center p-8">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-black text-white mb-2">تعذر الاتصال بالغرفة</h2>
            <p className="text-white/40 text-sm mb-6">قد تكون الغرفة مغلقة أو حدث خطأ في الاتصال</p>
            <button onClick={() => navigate("/coding-rooms")}
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171" }}>
              العودة للغرف
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const canWrite = !!(myInfo?.canWrite || myInfo?.role === "host");
  const canRun = !!(myInfo?.canRun || myInfo?.role === "host");

  return (
    <div className="h-screen flex flex-col overflow-hidden" dir="rtl" style={{ background: "#060912", fontFamily: "'Tajawal', sans-serif" }}>

      <AnimatePresence>
        {closingCountdown !== null && closingCountdown > 0 && (
          <motion.div initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }}
            className="z-50 text-center py-2 text-sm font-bold shrink-0"
            style={{ background: "#EF4444", color: "white" }}>
            ⚠️ الغرفة ستُغلق خلال {closingCountdown} ثانية — حمّل الكود الآن!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 px-4 h-12 shrink-0 border-b"
        style={{ background: "rgba(6,9,18,0.98)", borderColor: "rgba(16,185,129,0.12)" }}>
        <button onClick={handleLeave} className="flex items-center gap-1 text-xs text-white/30 hover:text-white/70 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> خروج
        </button>
        <div className="h-4 w-px bg-white/10" />
        <span className="text-sm font-bold" style={{ color: "#10B981" }}>
          {roomInfo?.title ?? `غرفة #${roomId}`}
        </span>
        {myInfo?.role === "host" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"
            style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
            <Crown className="w-2.5 h-2.5" />مشرف
          </span>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button onClick={toggleMic}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: micEnabled ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${micEnabled ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.1)"}`, color: micEnabled ? "#10B981" : "rgba(255,255,255,0.4)" }}>
            {micEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            {micEnabled ? "صوت" : "صامت"}
          </button>
          <button onClick={() => { setShowChat((v) => !v); setUnreadChat(0); }}
            className="relative flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: showChat ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${showChat ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)"}`, color: showChat ? "#3B82F6" : "rgba(255,255,255,0.4)" }}>
            <MessageSquare className="w-3 h-3" /> دردشة
            {unreadChat > 0 && !showChat && (
              <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                style={{ background: "#EF4444", color: "white" }}>{unreadChat > 9 ? "9+" : unreadChat}</span>
            )}
          </button>
          <button onClick={handleDownload}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
            <Download className="w-3 h-3" /> تحميل
          </button>
          {canRun && (
            <button onClick={handleRunCode} disabled={isRunning}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: isRunning ? "rgba(255,255,255,0.05)" : "rgba(16,185,129,0.15)", border: `1px solid ${isRunning ? "rgba(255,255,255,0.1)" : "rgba(16,185,129,0.4)"}`, color: isRunning ? "rgba(255,255,255,0.3)" : "#10B981" }}>
              {isRunning ? (
                <><div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "transparent" }} /> جاري...</>
              ) : (
                <><Play className="w-3 h-3" /> تشغيل</>
              )}
            </button>
          )}
          {!canRun && wsStatus === "connected" && (
            <button onClick={handleRunCode}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.25)" }}
              title="طلب إذن التشغيل من المشرف">
              <Play className="w-3 h-3" /> طلب تشغيل
            </button>
          )}
          {myInfo?.role === "host" && (
            <button onClick={handleCloseRoom}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171" }}>
              <X className="w-3 h-3" /> إغلاق
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        <div className="w-52 shrink-0 flex flex-col border-l overflow-hidden"
          style={{ background: "rgba(4,6,14,0.95)", borderColor: "rgba(16,185,129,0.08)" }}>
          <div className="p-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] font-bold text-white/50">الأعضاء ({members.length})</span>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {members.map((m) => (
                <MemberItem key={m.userId} member={m} isMe={m.userId === myUserId}
                  isHost={myInfo?.role === "host"} onPermChange={handlePermChange}
                  onKick={handleKick} onTransfer={handleTransfer} />
              ))}
              {members.length === 0 && (
                <div className="text-[11px] text-white/20 text-center py-2">لا أحد متصل</div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-[11px] font-bold text-white/40 mb-2">الملفات</div>
            <div className="space-y-1">
              {files.map((f) => (
                <button key={f.file_path} onClick={() => setActiveFile(f.file_path)}
                  className="w-full text-right px-2.5 py-1.5 rounded-lg text-[11px] transition-all truncate"
                  style={{ background: activeFile === f.file_path ? "rgba(16,185,129,0.12)" : "transparent", color: activeFile === f.file_path ? "#10B981" : "rgba(255,255,255,0.45)", border: activeFile === f.file_path ? "1px solid rgba(16,185,129,0.25)" : "1px solid transparent" }}>
                  {f.file_path}
                </button>
              ))}
              {files.length === 0 && wsStatus === "connected" && (
                <div className="text-[10px] text-white/20 text-center py-2">لا توجد ملفات</div>
              )}
            </div>
            {canWrite && (
              <div className="mt-3 flex gap-1">
                <input value={newFile} onChange={(e) => setNewFile(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewFile(); } }}
                  placeholder="ملف جديد مثل: app.py"
                  className="flex-1 text-[11px] px-2 py-1.5 rounded-lg outline-none text-white placeholder:text-white/20"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} />
                <button onClick={addNewFile} className="px-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors text-lg font-bold">+</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {myInfo?.role === "host" && pendingRequests.length > 0 && (
            <PendingBanner requests={pendingRequests} onAdmit={handleAdmit} onReject={handleReject} />
          )}
          {wsStatus === "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60 backdrop-blur-sm">
              <div className="text-center">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto mb-3" />
                <p className="text-white/50 text-sm">جاري الاتصال...</p>
              </div>
            </div>
          )}
          {wsStatus === "connected" && files.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="text-center">
                <div className="text-4xl mb-3 opacity-30">📄</div>
                <p className="text-white/20 text-sm">
                  {canWrite ? "أنشئ ملفاً للبدء" : "بانتظار إنشاء الملفات..."}
                </p>
              </div>
            </div>
          )}
          <Editor
            height="100%"
            defaultLanguage="javascript"
            defaultValue=""
            onMount={handleEditorMount}
            options={{
              fontSize: 14,
              fontFamily: "'Fira Code', 'Cascadia Code', monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
              lineNumbers: "on",
              roundedSelection: true,
              cursorBlinking: "smooth",
              smoothScrolling: true,
              wordWrap: "on",
              readOnly: !canWrite,
            }}
          />
        </div>

        <div className="w-72 shrink-0 flex flex-col border-r overflow-hidden"
          style={{ background: "rgba(4,6,14,0.95)", borderColor: "rgba(16,185,129,0.08)" }}>
          <div className="flex border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {([{ key: "output", label: "ناتج التشغيل" }, { key: "preview", label: "معاينة HTML" }] as const).map((tab) => (
              <button key={tab.key} onClick={() => setActiveRightTab(tab.key)}
                className="flex-1 py-2 text-[11px] font-bold transition-colors"
                style={{ background: activeRightTab === tab.key ? "rgba(16,185,129,0.1)" : "transparent", color: activeRightTab === tab.key ? "#10B981" : "rgba(255,255,255,0.3)", borderBottom: `1px solid ${activeRightTab === tab.key ? "#10B981" : "transparent"}` }}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
            {activeRightTab === "output" ? (
              runOutputs.length === 0 ? (
                <div className="text-white/20 text-center mt-8 text-[11px] font-sans">شغّل الكود لرؤية الناتج هنا</div>
              ) : (
                <div className="space-y-3">
                  {runOutputs.slice(-15).map((o, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
                      <div className="text-[9px] text-emerald-400/60 mb-1.5 font-sans flex items-center gap-1">
                        <span>{o.triggeredByName}</span>
                        <span className="text-white/20">•</span>
                        <span>{new Date(o.timestamp).toLocaleTimeString("ar")}</span>
                        {o.language && <span className="text-white/20">• {o.language}</span>}
                      </div>
                      <pre className="text-white/70 text-[11px] whitespace-pre-wrap break-all leading-relaxed">{o.output}</pre>
                    </div>
                  ))}
                </div>
              )
            ) : (
              previewHtml ? (
                <iframe srcDoc={previewHtml} className="w-full rounded-lg"
                  style={{ height: "calc(100vh - 140px)", border: "1px solid rgba(16,185,129,0.15)", background: "white" }}
                  sandbox="allow-scripts allow-same-origin" />
              ) : (
                <div className="text-white/20 text-center mt-8 text-[11px] font-sans">شغّل ملف HTML لرؤية المعاينة</div>
              )
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 300, opacity: 0 }}
            className="fixed bottom-4 left-4 w-80 h-96 rounded-2xl flex flex-col overflow-hidden z-50"
            style={{ background: "rgba(6,9,18,0.97)", border: "1px solid rgba(59,130,246,0.2)", boxShadow: "0 0 40px rgba(59,130,246,0.1), 0 20px 40px rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <span className="text-sm font-bold text-white/80">دردشة الغرفة</span>
              <button onClick={() => setShowChat(false)} className="text-white/30 hover:text-white/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scroll-smooth">
              {chatMsgs.map((m, i) => (
                <div key={i} className={`flex flex-col gap-0.5 ${m.userId === myUserId ? "items-start" : "items-end"}`}
                  dir={m.userId === -1 ? "rtl" : "rtl"}>
                  {m.userId === -1 ? (
                    <div className="text-[10px] text-white/25 text-center w-full">{m.text}</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                        <span className="text-[9px] text-white/30">{m.username}</span>
                      </div>
                      <div className="max-w-[85%] px-3 py-1.5 rounded-2xl text-xs break-words"
                        style={{ background: m.userId === myUserId ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${m.userId === myUserId ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)"}`, color: m.userId === myUserId ? "#e2e8f0" : "rgba(255,255,255,0.75)" }}>
                        {m.text}
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex gap-2">
                <input value={chatText} onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="اكتب رسالة..."
                  maxLength={500}
                  className="flex-1 text-sm px-3 py-2 rounded-xl outline-none text-white placeholder:text-white/20"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                <button onClick={sendChat} disabled={!chatText.trim()}
                  className="px-4 rounded-xl font-bold text-sm transition-all"
                  style={{ background: chatText.trim() ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)", color: chatText.trim() ? "#3B82F6" : "rgba(255,255,255,0.2)", border: `1px solid ${chatText.trim() ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.07)"}` }}>
                  إرسال
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
