import React, { useState, useEffect } from 'react';
import { api, resolveImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CommunityMessagingPage({ onOpenAuthModal }) {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('messaging'); // 'messaging' | 'admin'
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Load registered users to initiate / continue chats
  useEffect(() => {
    const loadChats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const users = await api.getUsers();
        // Exclude current user from contact list
        const peers = users.filter((u) => u._id !== user._id);
        setConversations(peers);
        setSelectedUser((prev) => prev || (peers.length > 0 ? peers[0] : null));
      } catch (err) {
        console.error('Failed to load users:', err.message);
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, [user]);

  // Load real messages for selected conversation
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedUser || !user) return;
      try {
        const msgs = await api.getMessages(selectedUser._id);
        setMessages(msgs);
      } catch (err) {
        console.error('Failed to load messages:', err.message);
      }
    };

    loadMessages();
  }, [selectedUser, user]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedUser) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');

    try {
      const savedMsg = await api.sendMessage({
        recipientId: selectedUser._id,
        text: textToSend
      });
      setMessages((prev) => [...prev, savedMsg]);
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">
        <span className="material-symbols-outlined text-5xl text-[#006c48]">chat</span>
        <h2 className="text-xl font-bold font-display text-[#00261d]">Sign in to Access Community Messaging</h2>
        <p className="text-xs text-[#717975]">Connect directly with lenders and borrowers to coordinate pickups and equipment questions.</p>
        <button
          onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
          className="px-6 py-2.5 rounded-full bg-[#006c48] text-white text-xs font-bold shadow-xs hover:bg-[#123c32] transition-colors"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 w-full flex flex-col gap-6 bg-[#FAFBF8]">
      
      {/* Top Toggle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e1ebe1]">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#00261d]">
            Community Hub & Messaging
          </h1>
          <p className="text-xs text-[#717975] mt-0.5">
            Peer communications stored in MongoDB • Signed in as: <strong>{user.name}</strong>
          </p>
        </div>

        <div className="inline-flex p-1 rounded-full bg-[#e6f1e7] border border-[#c0c8c4]/60">
          <button
            onClick={() => setActiveView('messaging')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'messaging' ? 'bg-[#123c32] text-white shadow-2xs' : 'text-[#414845] hover:text-[#151e18]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">chat</span>
            <span>Direct Messaging</span>
          </button>

          <button
            onClick={() => setActiveView('admin')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'admin' ? 'bg-[#123c32] text-white shadow-2xs' : 'text-[#414845] hover:text-[#151e18]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">verified_user</span>
            <span>Trust & Verification</span>
          </button>
        </div>
      </div>

      {activeView === 'messaging' ? (
        /* MESSAGING SPLIT INTERFACE */
        <div className="grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl border border-[#dbe5dc] shadow-xs overflow-hidden h-[620px]">
          
          {/* Left Conversations Sidebar (4 cols) */}
          <aside className="md:col-span-4 border-r border-[#e1ebe1] flex flex-col h-full bg-[#FAFBF8]">
            <div className="p-4 border-b border-[#e1ebe1]">
              <span className="text-xs font-bold text-[#151e18] uppercase tracking-wider">
                Community Members ({conversations.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#f2fcf2]">
              {loading ? (
                <div className="p-4 space-y-3">
                  <div className="h-12 bg-[#e6f1e7] rounded-xl animate-pulse"></div>
                  <div className="h-12 bg-[#e6f1e7] rounded-xl animate-pulse"></div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#717975]">
                  <span className="material-symbols-outlined text-3xl mb-1 text-[#717975]">group</span>
                  <p className="font-bold text-[#151e18]">No other members yet</p>
                  <p className="mt-1">When new users register on BorrowHub, they will appear here for messaging.</p>
                </div>
              ) : (
                conversations.map((contact) => {
                  const initial = contact.name ? contact.name.charAt(0).toUpperCase() : 'U';
                  const isSelected = selectedUser?._id === contact._id;
                  return (
                    <button
                      key={contact._id}
                      onClick={() => setSelectedUser(contact)}
                      className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${
                        isSelected ? 'bg-[#e6f1e7]' : 'hover:bg-[#ecf6ed]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#123c32] text-white flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0 border border-[#c0c8c4]">
                        {contact.avatar ? (
                          <img src={resolveImageUrl(contact.avatar)} alt={contact.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{initial}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-[#00261d] truncate">{contact.name}</h4>
                        <p className="text-[11px] text-[#006c48] font-semibold uppercase">{contact.role}</p>
                        {contact.location && (
                          <p className="text-[10px] text-[#717975] truncate">{contact.location}</p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Message Chat Window (8 cols) */}
          <main className="md:col-span-8 flex flex-col h-full">
            {selectedUser ? (
              <>
                {/* Active Chat Header */}
                <div className="p-4 border-b border-[#e1ebe1] bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#123c32] text-white flex items-center justify-center font-bold text-xs overflow-hidden border border-[#c0c8c4]">
                      {selectedUser.avatar ? (
                        <img src={resolveImageUrl(selectedUser.avatar)} alt={selectedUser.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#00261d]">{selectedUser.name}</h3>
                      <p className="text-[11px] text-[#006c48] font-semibold">{selectedUser.trustTier || 'Verified Member'}</p>
                    </div>
                  </div>
                  {selectedUser.location && (
                    <span className="text-xs text-[#717975]">{selectedUser.location}</span>
                  )}
                </div>

                {/* Messages Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAFBF8]">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-xs text-[#717975]">
                      <span className="material-symbols-outlined text-3xl mb-1 text-[#006c48]">chat_bubble_outline</span>
                      <p>Start a conversation with {selectedUser.name} about equipment coordination.</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender?._id === user._id || m.sender === user._id;
                      return (
                        <div key={m._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-xs md:max-w-md p-3 rounded-2xl text-xs leading-relaxed ${
                              isMe
                                ? 'bg-[#123c32] text-white rounded-tr-none'
                                : 'bg-white border border-[#dbe5dc] text-[#151e18] rounded-tl-none shadow-2xs'
                            }`}
                          >
                            <p>{m.text}</p>
                            <span className={`text-[10px] block text-right mt-1 ${isMe ? 'text-[#7dfabf]' : 'text-[#717975]'}`}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#e1ebe1] flex items-center gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={`Write a message to ${selectedUser.name}...`}
                    className="flex-1 bg-[#FAFBF8] border border-[#c0c8c4] rounded-full px-4 py-2.5 text-xs text-[#151e18] focus:outline-none focus:border-[#006c48]"
                  />
                  <button
                    type="submit"
                    className="w-10 h-10 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white flex items-center justify-center transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#717975]">
                {conversations.length > 0 ? 'Select a community member on the left to start messaging.' : 'No members available to message.'}
              </div>
            )}
          </main>
        </div>
      ) : (
        /* TRUST & VERIFICATION CONSOLE */
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#dbe5dc] shadow-xs space-y-4">
            <h2 className="font-display font-bold text-lg text-[#00261d] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006c48]">security</span>
              <span>Platform Trust, Underwriting & Verification</span>
            </h2>
            <p className="text-xs text-[#414845]">
              BorrowHub operates a peer guarantee backed by $15,000 underwriting per transaction.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#e6f1e7] border border-[#d5ebdd]">
                <span className="font-bold text-sm text-[#006c48] block">ID Verification</span>
                <span className="text-xs text-[#414845] mt-1 block">Community verification for active lenders and borrowers.</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#e6f1e7] border border-[#d5ebdd]">
                <span className="font-bold text-sm text-[#006c48] block">Escrow Holds</span>
                <span className="text-xs text-[#414845] mt-1 block">Deposits are safely authorized in escrow and released upon equipment return.</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#e6f1e7] border border-[#d5ebdd]">
                <span className="font-bold text-sm text-[#006c48] block">Dispute Moderation</span>
                <span className="text-xs text-[#414845] mt-1 block">Transparent resolution and condition checklists for equipment sharing.</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
