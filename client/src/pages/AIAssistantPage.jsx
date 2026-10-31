import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { projectScenarios } from '../data/aiKnowledge';

export default function AIAssistantPage({ onOpenListItemModal }) {

  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I'm your BorrowHub AI Equipment Planner. Tell me about your upcoming project (e.g., '15-minute indie dusk film' or '8x10 raised cedar garden bed'), and I will scan live neighborhood inventory in MongoDB to build your optimal, compatible equipment bundle.",
      time: 'Ready'
    }
  ]);

  const [items, setItems] = useState([]);
  const [reasoning, setReasoning] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [emptyNotice, setEmptyNotice] = useState(false);

  // Toggle item in bundle
  const toggleItem = (itemId) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, checked: !it.checked } : it))
    );
  };

  // Calculate live bundle total from actual matched items
  const selectedItems = items.filter((it) => it.checked);
  const bundleDailyTotal = selectedItems.reduce((sum, it) => sum + (Number(it.rate) || 0), 0);
  const bundleDiscount = Math.round(bundleDailyTotal * 0.1);
  const finalDailyRate = Math.max(0, bundleDailyTotal - bundleDiscount);

  const executePlan = async (projectDesc) => {
    if (!projectDesc.trim()) return;

    const userText = projectDesc.trim();
    setUserInput('');
    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: userText, time: 'Just now' }
    ]);

    setIsTyping(true);
    setEmptyNotice(false);

    try {
      const data = await api.planProject(userText);
      setIsTyping(false);

      if (data && data.plan) {
        const plan = data.plan;
        setReasoning(plan.reasoning || []);

        if (plan.recommendedTools && plan.recommendedTools.length > 0) {
          setItems(
            plan.recommendedTools.map((t) => ({
              id: t.id,
              name: t.name,
              role: t.role,
              rate: t.rate,
              checked: true,
              icon: 'handyman'
            }))
          );

          const disclosureNote = data.disclosure ? `\n\nℹ️ ${data.disclosure}` : '';
          setChatMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `AI Plan: "${plan.title}". Matched ${plan.recommendedTools.length} verified items directly from MongoDB. Estimated daily rate: $${plan.estimatedDailyRate}/day vs $${plan.retailBuyingCost} retail purchase (${plan.savingsPercentage}% savings). [Grounding: ${data.provider}]${disclosureNote}`,
              time: 'Just now'
            }
          ]);
        } else {
          setItems([]);
          setEmptyNotice(true);
          const emptyDisclosureNote = data.disclosure ? `\n\nℹ️ ${data.disclosure}` : '';
          setChatMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: (data.message || "No equipment listings currently available in the database to recommend. List gear in the marketplace to enable community equipment planning.") + emptyDisclosureNote,
              time: 'Just now'
            }
          ]);
        }
      }
    } catch (err) {
      setIsTyping(false);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Planning service error: ${err.message}. Please verify the backend is running and try again.`,
          time: 'Just now'
        }
      ]);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    executePlan(userInput);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 w-full flex flex-col gap-6">
      
      {/* Top Context & Live Network Tracker */}
      <section className="w-full flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e1ebe1]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e6f1e7] text-[#006c48] text-xs font-semibold border border-[#006c48]/20">
            <span className="w-2 h-2 rounded-full bg-[#006c48] animate-pulse"></span>
            Live MongoDB Inventory Grounding Active
          </span>
          <span className="hidden md:inline-flex items-center text-xs text-[#414845]">
            <span className="material-symbols-outlined text-[16px] mr-1 text-[#717975]">verified_user</span>
            Real database listings • Zero fabricated items
          </span>
        </div>

        {/* Quick Presets Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-[#717975]">Prompt Ideas:</span>
          {Object.entries(projectScenarios).map(([key, sc]) => (
            <button
              key={key}
              onClick={() => executePlan(sc.query)}
              className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold bg-white border border-[#c0c8c4] hover:bg-[#ecf6ed] text-[#151e18] transition-colors"
            >
              {sc.title}
            </button>
          ))}
        </div>
      </section>

      {/* Main Grid: Left Chat Stream (7 cols) + Right Live Rig Matrix (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ================= LEFT CHAT COLUMN (7 cols) ================= */}
        <div className="lg:col-span-7 flex flex-col h-[650px] bg-white rounded-3xl border border-[#dbe5dc] shadow-xs overflow-hidden">
          
          {/* Chat Header */}
          <div className="p-4 border-b border-[#e1ebe1] bg-[#FAFBF8] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-[#123c32] text-[#7dfabf] flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">psychology</span>
              </span>
              <div>
                <h3 className="font-bold text-sm text-[#00261d]">BorrowHub Smart Rig Assistant</h3>
                <p className="text-[11px] text-[#006c48] font-semibold">Grounded in Live Catalog</p>
              </div>
            </div>
            <span className="text-xs text-[#717975]">AI Planner</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#FAFBF8]">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#123c32] text-white rounded-tr-none'
                      : 'bg-white border border-[#dbe5dc] text-[#151e18] rounded-tl-none shadow-2xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
                <span className="text-[10px] text-[#717975] mt-1 px-1">{msg.time}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-[#717975] bg-white p-3 rounded-2xl border border-[#dbe5dc] w-fit">
                <span className="material-symbols-outlined text-sm animate-spin text-[#006c48]">sync</span>
                <span>Scanning MongoDB catalog and matching equipment...</span>
              </div>
            )}

            {emptyNotice && (
              <div className="p-4 rounded-2xl bg-[#fffbf2] border border-[#ffdea2] text-xs text-[#463200] flex flex-col gap-2">
                <p className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#c19841]">info</span>
                  <span>Database Empty Notice</span>
                </p>
                <p>
                  No items exist in the database matching this query. Add equipment through the listing form to populate your local community inventory.
                </p>
                {onOpenListItemModal && (
                  <button
                    onClick={onOpenListItemModal}
                    className="self-start mt-1 px-4 py-1.5 bg-[#006c48] text-white rounded-full font-bold text-[11px]"
                  >
                    List Gear Now
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-[#e1ebe1] flex items-center gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Describe your project (e.g. 15-minute campus short film at dusk)..."
              className="flex-1 bg-[#FAFBF8] border border-[#c0c8c4] rounded-full px-4 py-2.5 text-xs text-[#151e18] focus:outline-none focus:border-[#006c48]"
            />
            <button
              type="submit"
              disabled={isTyping || !userInput.trim()}
              className="w-10 h-10 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white flex items-center justify-center transition-colors shadow-xs disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </form>

        </div>

        {/* ================= RIGHT LIVE RIG MATRIX (5 cols) ================= */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="bg-white rounded-3xl border border-[#dbe5dc] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#e1ebe1]">
              <div>
                <h3 className="font-display font-bold text-sm text-[#00261d]">Configured Equipment Rig</h3>
                <p className="text-[11px] text-[#717975]">Real MongoDB listings</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#e6f1e7] text-[#006c48] font-bold text-xs">
                {selectedItems.length} selected
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#717975] flex flex-col items-center gap-2 bg-[#FAFBF8] rounded-2xl border border-dashed border-[#dbe5dc]">
                <span className="material-symbols-outlined text-3xl text-[#717975]">handyman</span>
                <p className="font-bold text-[#151e18]">No Equipment Rig Formed Yet</p>
                <p>Send a project prompt in the chat to match real gear from the MongoDB catalog.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it) => (
                  <div
                    key={it.id}
                    onClick={() => toggleItem(it.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      it.checked ? 'bg-[#f2fcf2] border-[#006c48]' : 'bg-[#FAFBF8] border-[#c0c8c4] opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${it.checked ? 'bg-[#006c48] text-white' : 'bg-[#c0c8c4] text-[#151e18]'}`}>
                        <span className="material-symbols-outlined text-sm">
                          {it.checked ? 'check' : 'add'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[#00261d] line-clamp-1">{it.name}</h4>
                        <p className="text-[11px] text-[#717975]">{it.role}</p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="font-bold text-xs text-[#00261d]">${it.rate}/day</span>
                    </div>
                  </div>
                ))}

                {/* Bundle Summary */}
                <div className="pt-3 border-t border-[#e1ebe1] space-y-2 text-xs">
                  <div className="flex justify-between text-[#414845]">
                    <span>Itemized Daily Rates</span>
                    <span className="font-semibold text-[#151e18]">${bundleDailyTotal}/day</span>
                  </div>
                  <div className="flex justify-between text-[#006c48] font-semibold">
                    <span>Bundle Discount (10%)</span>
                    <span>-${bundleDiscount}/day</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#00261d] pt-2 border-t border-[#e1ebe1]">
                    <span>Estimated Daily Rate</span>
                    <span>${finalDailyRate}/day</span>
                  </div>
                </div>

                <Link
                  to="/explore"
                  className="w-full py-3 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <span>Explore Items in Marketplace</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            )}
          </div>

          {/* Reasoning Highlights */}
          {reasoning.length > 0 && (
            <div className="bg-white rounded-3xl border border-[#dbe5dc] p-6 shadow-xs space-y-3">
              <h4 className="font-display font-bold text-xs text-[#00261d] uppercase tracking-wider">
                Compatibility & Rig Logic
              </h4>
              <div className="space-y-2.5">
                {reasoning.map((r, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <span className="material-symbols-outlined text-[#006c48] text-base mt-0.5">
                      {r.icon || 'check_circle'}
                    </span>
                    <div>
                      <p className="font-bold text-[#151e18]">{r.title}</p>
                      <p className="text-[#414845] text-[11px] mt-0.5">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
