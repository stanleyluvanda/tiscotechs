// src/components/MessagingDock.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getConversation,
  listPeople,
  listThreads,
  markRead,
  sendMessage,
} from "../lib/messagingApi";

// NOTE: swap this with your existing uploader component if you want inline upload UI.
// For now we allow pasting an attachment URL (CloudFront) plus optional filename.

function safeStr(x) {
  return String(x || "").trim();
}

function makeScopeKey(me) {
  return safeStr(me?.scopeKey);
}

export default function MessagingDock({ me }) {
  /*const userId = safeStr(me?.userId);*/
  const userId = safeStr(me?.userId || me?.id || me?.uid || me?.studentId || me?.lecturerId);
  const myRole = safeStr(me?.role); // "student" or "lecturer"
  const scopeKey = makeScopeKey(me);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("focused"); // focused | other (reserved)
  const [q, setQ] = useState("");

  const [people, setPeople] = useState([]);
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null); // { threadId, otherUserId, otherName, otherAvatarUrl }

  const [msgs, setMsgs] = useState([]);
  const [msgText, setMsgText] = useState("");

  // simple attachment input (url + name). Replace with your uploader if desired.
  const [attUrl, setAttUrl] = useState("");
  const [attName, setAttName] = useState("");

  const pollRef = useRef(null);
  const convoPollRef = useRef(null);

  const otherRole = useMemo(() => {
    if (myRole === "student") return "lecturer";
    if (myRole === "lecturer") return "student";
    return "lecturer";
  }, [myRole]);

  async function refreshThreads() {
    if (!userId) return;
    const data = await listThreads({ userId });
    setThreads(data.threads || []);
  }

  /*async function refreshPeople(search = "") {
    if (!scopeKey || !myRole) return;
    const data = await listPeople({ scopeKey, role: myRole, q: search });
    setPeople(data.people || []);
  }*/
  async function refreshPeople(search = "") {
  if (!scopeKey || !myRole) return;
  const data = await listPeople({ scopeKey, role: otherRole, q: search }); // ✅ target role
  setPeople(data.people || []);
}

  async function openConversation(thread) {
    setActive(thread);
    // fetch messages
    const data = await getConversation({ threadId: thread.threadId, limit: 50 });
    setMsgs(data.messages || []);
    // mark read
    await markRead({ userId, threadId: thread.threadId });
    // refresh threads to zero unread
    await refreshThreads();
  }

  async function handleSend() {
    if (!active) return;
    const text = safeStr(msgText);
    const attachments = [];

    const u = safeStr(attUrl);
    if (u) {
      attachments.push({
        url: u,
        name: safeStr(attName) || "attachment",
      });
    }

    if (!text && attachments.length === 0) return;

    await sendMessage({
      fromUserId: userId,
      toUserId: active.otherUserId,
      scopeKey,
      text,
      attachments,
    });

    setMsgText("");
    setAttUrl("");
    setAttName("");

    // refresh conversation + threads
    const data = await getConversation({ threadId: active.threadId, limit: 50 });
    setMsgs(data.messages || []);
    await refreshThreads();
  }

  // initial load when opened
  useEffect(() => {
    if (!open) return;
    refreshThreads();
    refreshPeople(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // search debounce
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => refreshPeople(q), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open]);

  // threads polling (unread across devices)
  useEffect(() => {
    if (!userId) return;
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      // do not hammer if closed; still poll lightly for badge
      refreshThreads().catch(() => {});
    }, open ? 6000 : 12000);

    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, open]);

  // conversation polling when active
  useEffect(() => {
    clearInterval(convoPollRef.current);
    if (!active?.threadId) return;

    convoPollRef.current = setInterval(async () => {
      try {
        const data = await getConversation({ threadId: active.threadId, limit: 50 });
        setMsgs(data.messages || []);
      } catch {}
    }, 4000);

    return () => clearInterval(convoPollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.threadId]);

  const unseen = useMemo(() => {
    return (threads || []).reduce((acc, t) => acc + (t.unreadCount || 0), 0);
  }, [threads]);

  if (!userId || !myRole || !scopeKey) return null;

  return (
    /*<div className="fixed bottom-4 right-4 z-50">*/
    <div className="fixed bottom-4 right-40 z-50">
      {/* collapsed pill */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-white shadow-lg border border-slate-200 px-3 py-2"
        >
          <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden">
            {me?.avatarUrl ? (
              <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : null}
          </div>
          <span className="font-semibold">Messaging</span>
          {unseen > 0 && (
            <span className="ml-1 text-xs bg-red-600 text-white rounded-full px-2 py-0.5">
              {unseen}
            </span>
          )}
          <span className="ml-2 text-slate-500">▲</span>
        </button>
      )}

      {/* expanded tray */}
      {open && (
        /*<div className="w-[360px] h-[520px] bg-white shadow-2xl border border-slate-200 rounded-xl overflow-hidden">*/
        <div className="w-[360px] h-[520px] bg-white shadow-2xl border border-slate-200 rounded-xl overflow-hidden mr-30">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden">
                {me?.avatarUrl ? (
                  <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="font-semibold">Messaging</div>
              {unseen > 0 && (
                <span className="text-xs bg-red-600 text-white rounded-full px-2 py-0.5">
                  {unseen}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setActive(null);
                setOpen(false);
              }}
              className="text-slate-600 hover:text-slate-900"
              title="Close"
            >
              ▼
            </button>
          </div>

          {/* search */}
          <div className="p-3 border-b border-slate-100">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${otherRole} by name`}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
            />
          </div>

          {/* tabs */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setTab("focused")}
              className={`flex-1 py-2 text-sm ${tab === "focused" ? "font-semibold border-b-2 border-emerald-600" : "text-slate-500"}`}
            >
              Focused
            </button>
            <button
              onClick={() => setTab("other")}
              className={`flex-1 py-2 text-sm ${tab === "other" ? "font-semibold border-b-2 border-emerald-600" : "text-slate-500"}`}
            >
              Other
            </button>
          </div>

          {/* content area */}
          <div className="h-[360px] overflow-auto">
            {/* active conversation */}
            {active ? (
              <div>
                <div className="flex items-center gap-2 p-3 border-b border-slate-100">
                  <button
                    onClick={() => setActive(null)}
                    className="text-slate-600 hover:text-slate-900"
                    title="Back"
                  >
                    ←
                  </button>
                  <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                    {active.otherAvatarUrl ? (
                      <img src={active.otherAvatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="font-semibold">{active.otherName || "Conversation"}</div>
                </div>

                <div className="p-3 space-y-2">
                  {msgs.map((m) => {
                    const mine = m.fromUserId === userId;
                    return (
                      <div key={m.messageId} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${mine ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-900"}`}>
                          {m.text ? <div className="whitespace-pre-wrap">{m.text}</div> : null}
                          {(m.attachments || []).map((a, idx) => (
                            <div key={idx} className="mt-2">
                              <a
                                href={a.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`underline ${mine ? "text-white" : "text-slate-700"}`}
                              >
                                {a.name || "attachment"}
                              </a>
                            </div>
                          ))}
                          <div className={`mt-1 text-[10px] opacity-80`}>
                            {new Date(m.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {msgs.length === 0 && (
                    <div className="text-sm text-slate-500">No messages yet.</div>
                  )}
                </div>
              </div>
            ) : (
              // list view: recent threads + people directory
              <div>
                <div className="px-3 py-2 text-xs font-semibold text-slate-500">Recent</div>
                {threads.map((t) => (
                  <button
                    key={t.threadId}
                    onClick={() => openConversation(t)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
                        {t.otherAvatarUrl ? (
                          <img src={t.otherAvatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold truncate">{t.otherName}</div>
                          {t.unreadCount > 0 && (
                            <span className="text-xs bg-emerald-600 text-white rounded-full px-2 py-0.5">
                              {t.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{t.lastText || ""}</div>
                      </div>
                    </div>
                  </button>
                ))}
                {threads.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">No conversations yet.</div>
                )}

                <div className="px-3 py-2 text-xs font-semibold text-slate-500 mt-2">
                  {otherRole === "lecturer" ? "Lecturers in your department" : "Students in your department"}
                </div>

                {people.map((p) => (
                  <button
                    key={p.userId}
                    onClick={() =>
                      openConversation({
                        threadId: p.threadId, // backend returns a deterministic threadId or we create on send
                        otherUserId: p.userId,
                        otherName: p.fullName,
                        otherAvatarUrl: p.avatarUrl,
                      })
                    }
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{p.fullName}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {p.program ? p.program : ""}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {people.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">No results.</div>
                )}
              </div>
            )}
          </div>

          {/* composer */}
          <div className="border-t border-slate-200 p-3">
            {!active ? (
              <div className="text-xs text-slate-500">
                Select a person or a recent conversation to start messaging.
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Write a message…"
                  className="w-full h-16 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={attUrl}
                    onChange={(e) => setAttUrl(e.target.value)}
                    placeholder="Attachment URL (CloudFront)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none"
                  />
                  <input
                    value={attName}
                    onChange={(e) => setAttName(e.target.value)}
                    placeholder="File name (optional)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSend}
                    className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-semibold"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}