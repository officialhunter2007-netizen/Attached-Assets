import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/use-auth";
import Editor, { type OnMount } from "@monaco-editor/react";
import {
  Mic, MicOff, MessageSquare, Users, Play, X, Crown,
  ChevronLeft, Download, AlertTriangle
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

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const EXT_TO_LANG: Record<string, string> = {
  js: "javascript", ts: "typescript", py: "python",
  html: "html", css: "css", rs: "rust", go: "go",
  java: "java", cpp: "cpp", php: "php", json: "json",
  md: "markdown", sh: "shell", sql: "sql",
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
        className="w-2.5 h-2.5 rounded-full shrink-0"
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
          <span className={`text-[9px] px-1 rounded ${member.canWrite ? "text-emerald-400" : "text-white/20"}`}>
            {member.canWrite ? "✏️ كتابة" : "👁️ قراءة"}
          </span>
          {member.canRun && (
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

export default function CodingRoom() {
  const [match, params] = useRoute<{ roomId: string }>("/coding-room/:roomId");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const roomId = parseInt(params?.roomId ?? "", 10);

  const wsRef = useRef<WebSocket | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const peerRefs = useRef<Map<number, RTCPeerConnection>>(new Map());

  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [myInfo, setMyInfo] = useState<{ role: "host" | "member"; color: string; canWrite: boolean; canRun: boolean } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [activeFile, setActiveFile] = useState<string>("");
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [runOutputs, setRunOutputs] = useState<RunOutput[]>([]);
  const [chatText, setChatText] = useState("");
  const [micEnabled, setMicEnabled] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [connected, setConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "error" | "waiting">("connecting");
  const [showChat, setShowChat] = useState(false);
  const [closingCountdown, setClosingCountdown] = useState<number | null>(null);
  const [newFile, setNewFile] = useState("");
  const [activeRightTab, setActiveRightTab] = useState<"output" | "preview">("output");
  const [previewHtml, setPreviewHtml] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  const initWebRTC = useCallback(async (targetUserId: number, initiator: boolean) => {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    peerRefs.current.set(targetUserId, pc);

    if (localStream) {
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
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
      const audio = document.createElement("audio");
      audio.srcObject = e.streams[0];
      audio.autoplay = true;
      audio.setAttribute("data-peer", String(targetUserId));
      document.body.appendChild(audio);
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
  }, [localStream]);

  const handleWebRTCSignal = useCallback(async (fromUserId: number, signal: any) => {
    let pc = peerRefs.current.get(fromUserId);
    if (!pc) pc = await initWebRTC(fromUserId, false);
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
  }, [initWebRTC]);

  const handleWsMessage = useCallback(async (raw: string) => {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }
    const myUserId = (user as any)?.id;

    switch (msg.type) {
      case "room_state":
        setMyInfo({ role: msg.role, color: msg.color, canWrite: msg.canWrite, canRun: msg.canRun });
        setMembers(msg.members ?? []);
        setFiles(msg.files ?? []);
        if (msg.files?.length > 0) setActiveFile((prev) => prev || msg.files[0].file_path);
        setWsStatus("connected");
        setConnected(true);
        break;

      case "member_joined":
        setMembers(msg.members ?? []);
        setChatMsgs((prev) => [...prev, {
          userId: -1, username: "النظام", color: "#64748B",
          text: `${msg.username} انضم للغرفة`, timestamp: new Date().toISOString(),
        }]);
        if (msg.userId !== myUserId) initWebRTC(msg.userId, true);
        break;

      case "member_left":
        setMembers(msg.members ?? []);
        setChatMsgs((prev) => [...prev, {
          userId: -1, username: "النظام", color: "#64748B",
          text: "عضو غادر الغرفة", timestamp: new Date().toISOString(),
        }]);
        { const pc = peerRefs.current.get(msg.userId); if (pc) { pc.close(); peerRefs.current.delete(msg.userId); } }
        document.querySelector(`audio[data-peer="${msg.userId}"]`)?.remove();
        break;

      case "host_changed":
        setMembers(msg.members ?? []);
        break;

      case "you_are_host":
        setMyInfo((prev) => prev ? { ...prev, role: "host" } : prev);
        setChatMsgs((prev) => [...prev, {
          userId: -1, username: "النظام", color: "#F59E0B",
          text: "أنت الآن مشرف الغرفة", timestamp: new Date().toISOString(),
        }]);
        break;

      case "permission_changed":
        setMembers(msg.members ?? []);
        if (msg.targetUserId === myUserId) {
          setMyInfo((prev) => prev ? { ...prev, canWrite: msg.canWrite, canRun: msg.canRun } : prev);
        }
        break;

      case "code_change":
        if (msg.userId !== myUserId && editorRef.current) {
          const currentValue = editorRef.current.getValue();
          if (msg.fullContent !== undefined && currentValue !== msg.fullContent) {
            const pos = editorRef.current.getPosition();
            editorRef.current.setValue(msg.fullContent);
            if (pos) editorRef.current.setPosition(pos);
          }
        }
        break;

      case "cursor_move":
        if (msg.userId !== myUserId && monacoRef.current && editorRef.current) {
          const color = msg.color ?? "#ffffff";
          const decorations = editorRef.current.createDecorationsCollection([{
            range: new monacoRef.current.Range(msg.line, msg.column, msg.line, msg.column + 1),
            options: {
              className: undefined,
              afterContentClassName: undefined,
              before: {
                content: " ",
                backgroundColor: color,
                border: `1px solid ${color}`,
              },
            },
          }]);
          setTimeout(() => decorations.clear(), 2000);
        }
        break;

      case "file_created":
        setFiles((prev) => {
          if (prev.find((f) => f.file_path === msg.filePath)) return prev;
          return [...prev, { file_path: msg.filePath, content: msg.content ?? "", language: "" }];
        });
        break;

      case "file_deleted":
        setFiles((prev) => {
          const remaining = prev.filter((f) => f.file_path !== msg.filePath);
          setActiveFile((cur) => cur === msg.filePath ? (remaining[0]?.file_path ?? "") : cur);
          return remaining;
        });
        break;

      case "file_delete_request":
        if (myInfo?.role === "host" && confirm(`${msg.username} يطلب حذف: ${msg.filePath}. موافق؟`)) {
          wsRef.current?.send(JSON.stringify({
            type: "file_delete_approve",
            filePath: msg.filePath,
            requestUserId: msg.userId,
          }));
        }
        break;

      case "chat_message":
        setChatMsgs((prev) => [...prev, msg]);
        break;

      case "run_output":
        setRunOutputs((prev) => [...prev, msg]);
        setActiveRightTab("output");
        break;

      case "room_closing":
        setClosingCountdown(msg.countdown ?? 30);
        break;

      case "room_closed":
        navigate("/coding-rooms");
        break;

      case "kicked":
        alert(msg.message);
        navigate("/coding-rooms");
        break;

      case "rejected":
        alert(msg.message);
        navigate("/coding-rooms");
        break;

      case "waiting_approval":
        setWsStatus("waiting");
        break;

      case "mic_state":
        setMembers((prev) => prev.map((m) =>
          m.userId === msg.userId ? { ...m, micEnabled: msg.enabled } : m
        ));
        break;

      case "webrtc_signal":
        handleWebRTCSignal(msg.fromUserId, msg.signal);
        break;
    }
  }, [user, myInfo, initWebRTC, handleWebRTCSignal, navigate]);

  useEffect(() => {
    if (!match || isNaN(roomId)) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/room/${roomId}`);
    wsRef.current = ws;
    ws.onopen = () => setWsStatus("connecting");
    ws.onmessage = (e) => handleWsMessage(e.data);
    ws.onerror = () => setWsStatus("error");
    ws.onclose = () => { setConnected(false); setWsStatus("error"); };
    return () => {
      ws.close();
      peerRefs.current.forEach((pc) => pc.close());
      peerRefs.current.clear();
      document.querySelectorAll("audio[data-peer]").forEach((el) => el.remove());
    };
  }, [match, roomId, handleWsMessage]);

  useEffect(() => {
    if (!match || isNaN(roomId)) return;
    fetch(`/api/coding-rooms/${roomId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.room) setRoomInfo(d.room); })
      .catch(() => {});
  }, [match, roomId]);

  useEffect(() => {
    if (!closingCountdown || closingCountdown <= 0) return;
    const t = setTimeout(() => setClosingCountdown((c) => c !== null ? c - 1 : null), 1000);
    return () => clearTimeout(t);
  }, [closingCountdown]);

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
      ],
      colors: {
        "editor.background": "#060912",
        "editor.foreground": "#E5E7EB",
        "editorCursor.foreground": "#10B981",
        "editor.lineHighlightBackground": "#10B98108",
        "editorLineNumber.foreground": "#374151",
        "editorLineNumber.activeForeground": "#10B981",
      },
    });
    monaco.editor.setTheme("nukhba-cyber");

    let sendTimer: ReturnType<typeof setTimeout> | null = null;
    editor.onDidChangeModelContent((e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      if (sendTimer) clearTimeout(sendTimer);
      sendTimer = setTimeout(() => {
        setActiveFile((currentFile) => {
          wsRef.current?.send(JSON.stringify({
            type: "code_change",
            file: currentFile,
            changes: e.changes,
            fullContent: editor.getValue(),
          }));
          return currentFile;
        });
      }, 150);
    });

    editor.onDidChangeCursorPosition((e) => {
      setActiveFile((currentFile) => {
        wsRef.current?.send(JSON.stringify({
          type: "cursor_move",
          file: currentFile,
          line: e.position.lineNumber,
          column: e.position.column,
        }));
        return currentFile;
      });
    });
  };

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !activeFile) return;
    const file = files.find((f) => f.file_path === activeFile);
    if (!file) return;
    const model = editorRef.current.getModel();
    if (model && model.getValue() !== file.content) {
      const pos = editorRef.current.getPosition();
      model.setValue(file.content ?? "");
      if (pos) editorRef.current.setPosition(pos);
    }
    const lang = getMonacoLang(activeFile);
    if (model) monacoRef.current.editor.setModelLanguage(model, lang);
    editorRef.current.updateOptions({ readOnly: !(myInfo?.canWrite || myInfo?.role === "host") });
  }, [activeFile, files, myInfo]);

  const sendChat = () => {
    if (!chatText.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "chat_message", text: chatText.trim() }));
    setChatText("");
  };

  const toggleMic = async () => {
    if (micEnabled) {
      localStream?.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
      setMicEnabled(false);
      wsRef.current?.send(JSON.stringify({ type: "mic_state", enabled: false }));
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
        setMicEnabled(true);
        wsRef.current?.send(JSON.stringify({ type: "mic_state", enabled: true }));
        peerRefs.current.forEach((pc) => stream.getTracks().forEach((track) => pc.addTrack(track, stream)));
      } catch { alert("تعذر الوصول إلى الميكروفون"); }
    }
  };

  const handlePermChange = (targetUserId: number, field: "canWrite" | "canRun", val: boolean) => {
    wsRef.current?.send(JSON.stringify({ type: "permission_change", targetUserId, [field]: val }));
  };

  const handleKick = (targetUserId: number) => {
    if (confirm("هل تريد طرد هذا العضو؟"))
      wsRef.current?.send(JSON.stringify({ type: "kick_member", targetUserId }));
  };

  const handleTransfer = (targetUserId: number) => {
    if (confirm("هل تريد نقل الإشراف لهذا العضو؟"))
      wsRef.current?.send(JSON.stringify({ type: "transfer_host", targetUserId }));
  };

  const handleCloseRoom = () => {
    if (confirm("إغلاق الغرفة؟ سيتم إعطاء المشتركين 30 ثانية لتحميل الكود."))
      wsRef.current?.send(JSON.stringify({ type: "room_closing" }));
  };

  const handleLeave = async () => {
    wsRef.current?.close();
    await fetch(`/api/coding-rooms/${roomId}/leave`, {
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
      if (fileList.length === 0) return;
      if (fileList.length === 1) {
        const blob = new Blob([fileList[0].content], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileList[0].file_path.split("/").pop() ?? "code.txt";
        a.click();
        return;
      }
      const combinedContent = fileList.map((f) =>
        `${"=".repeat(60)}\n${f.file_path}\n${"=".repeat(60)}\n${f.content}\n`
      ).join("\n");
      const blob = new Blob([combinedContent], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `room-${roomId}-code.txt`;
      a.click();
    } catch { alert("فشل التحميل"); }
  };

  const handleRunCode = () => {
    if (!myInfo?.canRun && myInfo?.role !== "host") {
      wsRef.current?.send(JSON.stringify({ type: "run_code" }));
      return;
    }
    const file = files.find((f) => f.file_path === activeFile);
    if (!file) return;
    if (activeFile.endsWith(".html")) {
      setPreviewHtml(file.content);
      setActiveRightTab("preview");
      wsRef.current?.send(JSON.stringify({ type: "run_output", output: "[HTML preview shown]", language: "html" }));
      return;
    }
    const ext = activeFile.split(".").pop()?.toLowerCase() ?? "";
    const langMap: Record<string, string> = { js: "nodejs", py: "cpython", ts: "typescript" };
    const lang = langMap[ext] ?? "nodejs";
    fetch("/api/ai/run-code", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang, code: file.content }),
    }).then((r) => r.json()).then((d) => {
      wsRef.current?.send(JSON.stringify({
        type: "run_output", output: d.output ?? d.error ?? "لا يوجد ناتج", language: lang,
      }));
    }).catch(() => {
      wsRef.current?.send(JSON.stringify({ type: "run_output", output: "خطأ في الاتصال بخادم التشغيل", language: lang }));
    });
  };

  const addNewFile = () => {
    const filePath = newFile.trim();
    if (!filePath) return;
    wsRef.current?.send(JSON.stringify({ type: "file_created", filePath, content: "" }));
    setFiles((prev) => prev.find((f) => f.file_path === filePath) ? prev : [...prev, { file_path: filePath, content: "", language: "" }]);
    setActiveFile(filePath);
    setNewFile("");
  };

  const myUserId = (user as any)?.id;

  if (!match) return null;

  if (wsStatus === "waiting") {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen" style={{ background: "hsl(222,28%,7%)" }} dir="rtl">
          <div className="text-center">
            <div className="text-5xl mb-4 animate-pulse">⏳</div>
            <h2 className="text-xl font-black text-white mb-2">بانتظار موافقة المشرف</h2>
            <p className="text-white/40 text-sm">سيتم إعلامك عند القبول</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (wsStatus === "error" && !connected) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen" dir="rtl">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-black text-white mb-2">تعذر الاتصال بالغرفة</h2>
            <button onClick={() => navigate("/coding-rooms")} className="mt-4 px-6 py-3 rounded-xl font-bold text-sm"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171" }}>
              العودة للغرف
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" dir="rtl" style={{ background: "#060912", fontFamily: "'Tajawal', sans-serif" }}>

      <AnimatePresence>
        {closingCountdown !== null && closingCountdown > 0 && (
          <motion.div initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }}
            className="z-50 text-center py-2 text-sm font-bold" style={{ background: "#EF4444", color: "white" }}>
            ⚠️ الغرفة ستُغلق خلال {closingCountdown} ثانية — حمّل الكود الآن!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 h-12 shrink-0 border-b"
        style={{ background: "rgba(6,9,18,0.98)", borderColor: "rgba(16,185,129,0.12)" }}>
        <button onClick={handleLeave} className="flex items-center gap-1 text-xs text-white/30 hover:text-white/70 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> خروج
        </button>
        <div className="h-4 w-px bg-white/10" />
        <span className="text-sm font-bold" style={{ color: "#10B981" }}>{roomInfo?.title ?? `غرفة #${roomId}`}</span>
        {myInfo?.role === "host" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
            <Crown className="w-2.5 h-2.5 inline mr-0.5" />مشرف
          </span>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button onClick={toggleMic} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: micEnabled ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${micEnabled ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.1)"}`, color: micEnabled ? "#10B981" : "rgba(255,255,255,0.4)" }}>
            {micEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            {micEnabled ? "صوت" : "صامت"}
          </button>
          <button onClick={() => setShowChat((v) => !v)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: showChat ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${showChat ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)"}`, color: showChat ? "#3B82F6" : "rgba(255,255,255,0.4)" }}>
            <MessageSquare className="w-3 h-3" /> دردشة
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
            <Download className="w-3 h-3" /> تحميل
          </button>
          {(myInfo?.canRun || myInfo?.role === "host") && (
            <button onClick={handleRunCode} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#10B981" }}>
              <Play className="w-3 h-3" /> تشغيل
            </button>
          )}
          {myInfo?.role === "host" && (
            <button onClick={handleCloseRoom} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171" }}>
              <X className="w-3 h-3" /> إغلاق
            </button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <div className="w-52 shrink-0 flex flex-col border-l overflow-hidden"
          style={{ background: "rgba(4,6,14,0.95)", borderColor: "rgba(16,185,129,0.08)" }}>
          <div className="p-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] font-bold text-white/50">الأعضاء ({members.length})</span>
            </div>
            <div className="space-y-1.5">
              {members.map((m) => (
                <MemberItem key={m.userId} member={m} isMe={m.userId === myUserId}
                  isHost={myInfo?.role === "host"} onPermChange={handlePermChange}
                  onKick={handleKick} onTransfer={handleTransfer} />
              ))}
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
            </div>
            {(myInfo?.canWrite || myInfo?.role === "host") && (
              <div className="mt-3 flex gap-1">
                <input value={newFile} onChange={(e) => setNewFile(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNewFile()}
                  placeholder="ملف جديد..." className="flex-1 text-[11px] px-2 py-1.5 rounded-lg outline-none text-white placeholder:text-white/20"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} />
                <button onClick={addNewFile} className="px-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors">+</button>
              </div>
            )}
          </div>
        </div>

        {/* Center — Monaco */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {wsStatus === "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60">
              <div className="text-center">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto mb-3" />
                <p className="text-white/50 text-sm">جاري الاتصال...</p>
              </div>
            </div>
          )}
          <Editor
            height="100%"
            language={getMonacoLang(activeFile || "code.js")}
            value={files.find((f) => f.file_path === activeFile)?.content ?? ""}
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
              readOnly: !(myInfo?.canWrite || myInfo?.role === "host"),
            }}
          />
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 flex flex-col border-r overflow-hidden"
          style={{ background: "rgba(4,6,14,0.95)", borderColor: "rgba(16,185,129,0.08)" }}>
          <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {[{ key: "output", label: "ناتج التشغيل" }, { key: "preview", label: "معاينة" }].map((tab) => (
              <button key={tab.key} onClick={() => setActiveRightTab(tab.key as any)}
                className="flex-1 py-2 text-[11px] font-bold transition-colors"
                style={{ background: activeRightTab === tab.key ? "rgba(16,185,129,0.1)" : "transparent", color: activeRightTab === tab.key ? "#10B981" : "rgba(255,255,255,0.3)", borderBottom: activeRightTab === tab.key ? "1px solid #10B981" : "1px solid transparent" }}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
            {activeRightTab === "output" ? (
              runOutputs.length === 0 ? (
                <div className="text-white/20 text-center mt-8 text-[11px]">لا يوجد ناتج بعد</div>
              ) : (
                <div className="space-y-3">
                  {runOutputs.slice(-10).map((o, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
                      <div className="text-[9px] text-emerald-400/60 mb-1 font-sans">{o.triggeredByName} • {new Date(o.timestamp).toLocaleTimeString("ar")}</div>
                      <pre className="text-white/70 text-[11px] whitespace-pre-wrap break-all">{o.output}</pre>
                    </div>
                  ))}
                </div>
              )
            ) : (
              previewHtml ? (
                <iframe srcDoc={previewHtml} className="w-full rounded-lg"
                  style={{ height: "calc(100vh - 200px)", border: "1px solid rgba(16,185,129,0.15)", background: "white" }}
                  sandbox="allow-scripts allow-same-origin" />
              ) : (
                <div className="text-white/20 text-center mt-8 text-[11px] font-sans">شغّل ملف HTML لرؤية المعاينة</div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Chat floating panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 300, opacity: 0 }}
            className="fixed bottom-4 left-4 w-72 h-96 rounded-2xl flex flex-col overflow-hidden z-50"
            style={{ background: "rgba(6,9,18,0.97)", border: "1px solid rgba(59,130,246,0.2)", boxShadow: "0 0 40px rgba(59,130,246,0.15), 0 20px 40px rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <span className="text-sm font-bold text-white/80">دردشة الغرفة</span>
              <button onClick={() => setShowChat(false)} className="text-white/30 hover:text-white transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMsgs.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.userId === myUserId ? "items-end" : "items-start"}`}>
                  {m.userId !== myUserId && (
                    <span className="text-[10px] mb-0.5 font-bold" style={{ color: m.color }}>{m.username}</span>
                  )}
                  <div className="max-w-[85%] px-3 py-1.5 rounded-xl text-xs"
                    style={{ background: m.userId === -1 ? "rgba(100,116,139,0.15)" : m.userId === myUserId ? `${m.color}20` : "rgba(255,255,255,0.06)", border: `1px solid ${m.userId === -1 ? "rgba(100,116,139,0.2)" : m.userId === myUserId ? m.color + "40" : "rgba(255,255,255,0.08)"}`, color: m.userId === -1 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.8)" }}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex gap-2">
                <input value={chatText} onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="رسالة..." dir="rtl"
                  className="flex-1 px-3 py-2 rounded-xl text-xs text-white placeholder:text-white/20 outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                <button onClick={sendChat} className="px-3 rounded-xl text-xs font-bold"
                  style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)", color: "#3B82F6" }}>
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
