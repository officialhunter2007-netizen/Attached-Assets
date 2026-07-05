import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/use-auth";
import Editor, { type OnMount } from "@monaco-editor/react";
import {
  Mic, MicOff, MessageSquare, Users, Play, X, Crown,
  ChevronLeft, Download, AlertTriangle, Clock, Check,
  Pencil, Plus, Terminal, Eye, ChevronDown, Send, FileCode2,
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
  const isHostMember = member.role === "host";
  const canWrite = member.canWrite || isHostMember;
  const canRun = member.canRun || isHostMember;
  const initial = member.username?.trim()?.charAt(0)?.toUpperCase() || "؟";
  return (
    <div
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl group transition-colors"
      style={{
        background: isMe ? `${member.color}12` : "rgba(255,255,255,0.02)",
        border: `1px solid ${isMe ? member.color + "33" : "rgba(255,255,255,0.05)"}`,
      }}
    >
      <div className="relative shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
          style={{ background: `${member.color}22`, border: `1.5px solid ${member.color}`, color: member.color }}
        >
          {initial}
        </div>
        <div
          className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2"
          style={{ background: member.isOnline ? "#10B981" : "#4B5563", borderColor: "#04060e" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-bold text-white/85 truncate">{member.username}</span>
          {isHostMember && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
          {isMe && <span className="text-[10px] text-white/35 shrink-0">(أنا)</span>}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: canWrite ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)", color: canWrite ? "#34D399" : "rgba(255,255,255,0.35)" }}
          >
            {canWrite ? "كتابة" : "قراءة"}
          </span>
          {canRun && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.12)", color: "#60A5FA" }}>
              تشغيل
            </span>
          )}
          {member.micEnabled && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded" style={{ background: "rgba(16,185,129,0.15)" }}>
              <Mic className="w-2.5 h-2.5 text-emerald-400" />
            </span>
          )}
        </div>
      </div>
      {isHost && !isMe && (
        <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onPermChange(member.userId, "canWrite", !member.canWrite)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ background: member.canWrite ? "rgba(16,185,129,0.12)" : "transparent" }}
            title={member.canWrite ? "سحب الكتابة" : "منح الكتابة"}
          >
            <Pencil className="w-3.5 h-3.5" style={{ color: member.canWrite ? "#10B981" : "rgba(255,255,255,0.35)" }} />
          </button>
          <button
            onClick={() => onPermChange(member.userId, "canRun", !member.canRun)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ background: member.canRun ? "rgba(59,130,246,0.12)" : "transparent" }}
            title={member.canRun ? "سحب التشغيل" : "منح التشغيل"}
          >
            <Play className="w-3.5 h-3.5" style={{ color: member.canRun ? "#3B82F6" : "rgba(255,255,255,0.35)" }} />
          </button>
          <button
            onClick={() => onTransfer(member.userId)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-amber-500/20"
            title="نقل الإشراف"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
          </button>
          <button
            onClick={() => onKick(member.userId)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/20"
            title="طرد"
          >
            <X className="w-3.5 h-3.5 text-red-400" />
          </button>
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
    <div
      className="shrink-0 flex flex-col gap-1.5 p-2.5 border-b"
      style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.2)" }}
    >
      {requests.map((r) => (
        <div key={r.userId} className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
          <span className="text-xs text-amber-200 flex-1 font-bold truncate">
            <span className="text-amber-400">{r.username}</span> يطلب الدخول للغرفة
          </span>
          <button onClick={() => onAdmit(r.userId)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors hover:bg-emerald-500/20"
            style={{ color: "#34D399", border: "1px solid rgba(16,185,129,0.35)" }}>
            <Check className="w-3.5 h-3.5" /> قبول
          </button>
          <button onClick={() => onReject(r.userId)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors hover:bg-red-500/20"
            style={{ color: "#F87171", border: "1px solid rgba(239,68,68,0.35)" }}>
            <X className="w-3.5 h-3.5" /> رفض
          </button>
        </div>
      ))}
    </div>
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
  const [dockOpen, setDockOpen] = useState(true);
  const [addingFile, setAddingFile] = useState(false);

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
        setDockOpen(true);
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
      setDockOpen(true);
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
      setAddingFile(false);
      return;
    }
    wsRef.current?.send(JSON.stringify({ type: "file_created", filePath, content: "" }));
    setNewFile("");
    setAddingFile(false);
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
            className="z-50 flex items-center justify-center gap-2 text-center py-2 text-sm font-bold shrink-0"
            style={{ background: "linear-gradient(90deg,#DC2626,#EF4444,#DC2626)", color: "white" }}>
            <AlertTriangle className="w-4 h-4" />
            الغرفة ستُغلق خلال {closingCountdown} ثانية — حمّل الكود الآن!
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center gap-3 px-4 h-14 shrink-0 border-b"
        style={{ background: "rgba(6,9,18,0.98)", borderColor: "rgba(255,255,255,0.07)" }}>
        <button onClick={handleLeave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/50 hover:text-white/90 transition-colors shrink-0"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <ChevronLeft className="w-4 h-4" /> خروج
        </button>

        <div className="h-6 w-px bg-white/10 shrink-0" />

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <Terminal className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-white truncate max-w-[200px]">
                {roomInfo?.title ?? `غرفة #${roomId}`}
              </span>
              {myInfo?.role === "host" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 shrink-0"
                  style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
                  <Crown className="w-2.5 h-2.5" /> مشرف
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: wsStatus === "connected" ? "#10B981" : wsStatus === "error" ? "#EF4444" : "#F59E0B",
                  boxShadow: `0 0 6px ${wsStatus === "connected" ? "#10B981" : wsStatus === "error" ? "#EF4444" : "#F59E0B"}`,
                }} />
              <span className="text-[10px] text-white/40 font-medium">
                {wsStatus === "connected" ? "متصل" : wsStatus === "error" ? "انقطع الاتصال" : "جاري الاتصال…"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={toggleMic}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: micEnabled ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.04)", border: `1px solid ${micEnabled ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.1)"}`, color: micEnabled ? "#34D399" : "rgba(255,255,255,0.5)" }}>
            {micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{micEnabled ? "صوت" : "صامت"}</span>
          </button>

          <button onClick={() => { setShowChat((v) => !v); setUnreadChat(0); }}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: showChat ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)", border: `1px solid ${showChat ? "rgba(59,130,246,0.45)" : "rgba(255,255,255,0.1)"}`, color: showChat ? "#60A5FA" : "rgba(255,255,255,0.5)" }}>
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">دردشة</span>
            {unreadChat > 0 && !showChat && (
              <span className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
                style={{ background: "#EF4444", color: "white" }}>{unreadChat > 9 ? "9+" : unreadChat}</span>
            )}
          </button>

          <button onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">تحميل</span>
          </button>

          <div className="h-6 w-px bg-white/10" />

          {canRun ? (
            <button onClick={handleRunCode} disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-black transition-all"
              style={{ background: isRunning ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg,#10B981,#059669)", border: "1px solid rgba(16,185,129,0.5)", color: isRunning ? "#34D399" : "#04120c", boxShadow: isRunning ? "none" : "0 0 20px rgba(16,185,129,0.3)" }}>
              {isRunning ? (
                <><div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(52,211,153,0.3)", borderTopColor: "#34D399" }} /> جاري…</>
              ) : (
                <><Play className="w-3.5 h-3.5" fill="currentColor" /> تشغيل</>
              )}
            </button>
          ) : wsStatus === "connected" ? (
            <button onClick={handleRunCode} title="طلب إذن التشغيل من المشرف"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
              <Play className="w-3.5 h-3.5" /> طلب تشغيل
            </button>
          ) : null}

          {myInfo?.role === "host" && (
            <button onClick={handleCloseRoom}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171" }}>
              <X className="w-3.5 h-3.5" /> <span className="hidden sm:inline">إغلاق</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        <aside className="w-64 shrink-0 flex flex-col border-l overflow-hidden"
          style={{ background: "rgba(4,6,14,0.97)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white/70">الأعضاء</span>
            </div>
            <span className="text-xs font-black px-2 py-0.5 rounded-full"
              style={{ background: "rgba(16,185,129,0.12)", color: "#34D399" }}>{members.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {members.map((m) => (
              <MemberItem key={m.userId} member={m} isMe={m.userId === myUserId}
                isHost={myInfo?.role === "host"} onPermChange={handlePermChange}
                onKick={handleKick} onTransfer={handleTransfer} />
            ))}
            {members.length === 0 && (
              <div className="text-xs text-white/25 text-center py-8">لا أحد متصل بعد</div>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">

          {myInfo?.role === "host" && (
            <PendingBanner requests={pendingRequests} onAdmit={handleAdmit} onReject={handleReject} />
          )}

          <div className="flex items-stretch shrink-0 border-b overflow-x-auto"
            style={{ background: "rgba(4,6,14,0.9)", borderColor: "rgba(255,255,255,0.06)" }}>
            {files.map((f) => {
              const active = activeFile === f.file_path;
              return (
                <button key={f.file_path} onClick={() => setActiveFile(f.file_path)}
                  className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors relative border-l shrink-0"
                  style={{ background: active ? "rgba(16,185,129,0.08)" : "transparent", color: active ? "#34D399" : "rgba(255,255,255,0.45)", borderColor: "rgba(255,255,255,0.05)" }}>
                  <FileCode2 className="w-3.5 h-3.5 shrink-0" style={{ opacity: active ? 1 : 0.5 }} />
                  {f.file_path}
                  {active && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "#10B981" }} />}
                </button>
              );
            })}
            {canWrite && (
              addingFile ? (
                <div className="flex items-center gap-1 px-2 shrink-0">
                  <input autoFocus value={newFile} onChange={(e) => setNewFile(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewFile(); } else if (e.key === "Escape") { setNewFile(""); setAddingFile(false); } }}
                    onBlur={() => { if (!newFile.trim()) setAddingFile(false); }}
                    placeholder="app.py"
                    className="w-32 text-xs px-2.5 py-1.5 rounded-lg outline-none text-white placeholder:text-white/25"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(16,185,129,0.3)" }} />
                  <button onClick={addNewFile}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400 hover:bg-emerald-500/15 transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setAddingFile(true)} title="ملف جديد"
                  className="px-3 flex items-center justify-center text-white/40 hover:text-emerald-400 transition-colors shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              )
            )}
          </div>

          <div className="flex-1 relative overflow-hidden">
            {wsStatus === "connecting" && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60 backdrop-blur-sm">
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto mb-3" />
                  <p className="text-white/50 text-sm">جاري الاتصال…</p>
                </div>
              </div>
            )}
            {wsStatus === "connected" && files.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="text-center">
                  <FileCode2 className="w-12 h-12 mx-auto mb-3 text-white/15" />
                  <p className="text-white/30 text-sm font-bold mb-1">
                    {canWrite ? "لا توجد ملفات بعد" : "بانتظار إنشاء الملفات…"}
                  </p>
                  {canWrite && <p className="text-white/20 text-xs">اضغط + في شريط الملفات لإنشاء ملف جديد</p>}
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

          <div className="shrink-0 flex flex-col border-t overflow-hidden"
            style={{ background: "rgba(4,6,14,0.97)", borderColor: "rgba(255,255,255,0.07)", height: dockOpen ? 240 : "auto" }}>
            <div className="flex items-center shrink-0 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {([{ key: "output", label: "ناتج التشغيل", icon: Terminal }, { key: "preview", label: "معاينة HTML", icon: Eye }] as const).map((t) => {
                const active = activeRightTab === t.key;
                const Icon = t.icon;
                return (
                  <button key={t.key} onClick={() => { setActiveRightTab(t.key); setDockOpen(true); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors relative"
                    style={{ color: active && dockOpen ? "#34D399" : "rgba(255,255,255,0.4)", background: active && dockOpen ? "rgba(16,185,129,0.06)" : "transparent" }}>
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                    {active && dockOpen && <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "#10B981" }} />}
                  </button>
                );
              })}
              <div className="flex-1" />
              <button onClick={() => setDockOpen((v) => !v)}
                className="px-3 py-2.5 text-white/40 hover:text-white/80 transition-colors"
                title={dockOpen ? "طي اللوحة" : "فتح اللوحة"}>
                <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: dockOpen ? "none" : "rotate(180deg)" }} />
              </button>
            </div>
            {dockOpen && (
              activeRightTab === "output" ? (
                <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
                  {runOutputs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/25 font-sans gap-2">
                      <Terminal className="w-8 h-8 text-white/10" />
                      <span className="text-xs">شغّل الكود لرؤية الناتج هنا</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {runOutputs.slice(-15).map((o, i) => (
                        <div key={i} className="rounded-lg p-3" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
                          <div className="text-[10px] text-emerald-400/70 mb-1.5 font-sans flex items-center gap-1.5">
                            <span className="font-bold">{o.triggeredByName}</span>
                            <span className="text-white/20">•</span>
                            <span>{new Date(o.timestamp).toLocaleTimeString("ar")}</span>
                            {o.language && <span className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: "rgba(59,130,246,0.12)", color: "#60A5FA" }}>{o.language}</span>}
                          </div>
                          <pre className="text-white/75 text-[11px] whitespace-pre-wrap break-all leading-relaxed">{o.output}</pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-hidden p-2">
                  {previewHtml ? (
                    <iframe srcDoc={previewHtml} className="w-full h-full rounded-lg"
                      style={{ border: "1px solid rgba(16,185,129,0.15)", background: "white" }}
                      sandbox="allow-scripts allow-same-origin" />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-white/25 font-sans gap-2">
                      <Eye className="w-8 h-8 text-white/10" />
                      <span className="text-xs">شغّل ملف HTML لرؤية المعاينة</span>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 340, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-4 left-4 w-80 h-[440px] rounded-2xl flex flex-col overflow-hidden z-50"
            style={{ background: "rgba(6,9,18,0.98)", border: "1px solid rgba(59,130,246,0.25)", boxShadow: "0 0 40px rgba(59,130,246,0.12), 0 20px 50px rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-white/85">دردشة الغرفة</span>
              </div>
              <button onClick={() => setShowChat(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scroll-smooth">
              {chatMsgs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-white/20 gap-2">
                  <MessageSquare className="w-7 h-7 text-white/10" />
                  <span className="text-xs">ابدأ المحادثة مع زملائك</span>
                </div>
              )}
              {chatMsgs.map((m, i) => (
                <div key={i} className={`flex flex-col gap-0.5 ${m.userId === myUserId ? "items-start" : "items-end"}`}>
                  {m.userId === -1 ? (
                    <div className="text-[10px] text-white/30 text-center w-full py-1">{m.text}</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 px-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                        <span className="text-[10px] text-white/35 font-medium">{m.username}</span>
                      </div>
                      <div className="max-w-[85%] px-3 py-2 rounded-2xl text-[13px] break-words leading-relaxed"
                        style={{ background: m.userId === myUserId ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${m.userId === myUserId ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)"}`, color: m.userId === myUserId ? "#d1fae5" : "rgba(255,255,255,0.8)" }}>
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
                  placeholder="اكتب رسالة…"
                  maxLength={500}
                  className="flex-1 text-sm px-3 py-2.5 rounded-xl outline-none text-white placeholder:text-white/25"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                <button onClick={sendChat} disabled={!chatText.trim()}
                  className="w-11 rounded-xl flex items-center justify-center font-bold transition-all shrink-0"
                  style={{ background: chatText.trim() ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)", color: chatText.trim() ? "#60A5FA" : "rgba(255,255,255,0.2)", border: `1px solid ${chatText.trim() ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.07)"}` }}>
                  <Send className="w-4 h-4" style={{ transform: "scaleX(-1)" }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
