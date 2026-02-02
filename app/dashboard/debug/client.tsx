"use client";

import { useState } from "react";
import { triggerAiJob, getRecentTransactions } from "@/actions/debug";
import { testQueueAction } from "@/actions/test-queue";

export function DebugClient({ user }: { user: any }) {
    const [logs, setLogs] = useState<string[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const addLog = (msg: string) => setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

    const handleTestQueue = async () => {
        addLog("Triggering Simple Queue Job...");
        const res = await testQueueAction();
        if (res.success) {
            addLog(`✅ Job enqueued! ID: ${res.jobId}`);
        } else {
            addLog(`❌ Error: ${res.error}`);
        }
    };

    const handleTestAiBilling = async () => {
        addLog("Triggering AI Job (Billing Test)...");
        const res = await triggerAiJob();
        if (res.success) {
            addLog(`✅ AI Job enqueued! ID: ${res.jobId}`);
            addLog("Wait 2-3 seconds for worker to process...");
            setTimeout(fetchTransactions, 3000); // Auto-refresh txs
        } else {
            addLog(`❌ Error: ${res.error}`);
        }
    };

    const fetchTransactions = async () => {
        setLoading(true);
        const txs = await getRecentTransactions();
        setTransactions(txs);
        setLoading(false);
        addLog("Transactions refreshed.");
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
                {/* ACTIONS */}
                <div className="rounded-xl border bg-card shadow">
                    <div className="p-6 header border-b">
                        <h3 className="font-semibold">Control Panel</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <button
                            onClick={handleTestQueue}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
                        >
                            Test 1: Simple Queue Job
                        </button>
                        <div className="text-xs text-muted-foreground p-2 bg-slate-50 rounded">
                            Checks if Redis/BullMQ are connected. Worker logs should show "TEST_JOB".
                        </div>

                        <hr />

                        <button
                            onClick={handleTestAiBilling}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition"
                        >
                            Test 2: Trigger AI Job (Billing)
                        </button>
                        <div className="text-xs text-muted-foreground p-2 bg-slate-50 rounded">
                            Dispatches `PROCESS_DOCUMENT`. Worker calls `AiGateway`. DB should record transaction.
                        </div>
                    </div>
                </div>

                {/* LOGS */}
                <div className="rounded-xl border bg-card shadow h-64 flex flex-col">
                    <div className="p-4 border-b bg-slate-100 rounded-t-xl">
                        <h3 className="font-mono text-sm font-semibold">Client Logs</h3>
                    </div>
                    <div className="p-4 font-mono text-xs overflow-auto flex-1 bg-slate-900 text-green-400">
                        {logs.length === 0 ? "Ready..." : logs.map((log, i) => <div key={i}>{log}</div>)}
                    </div>
                </div>
            </div>

            {/* TRANSACTIONS */}
            <div className="rounded-xl border bg-card shadow">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="font-semibold">Billing History (Live)</h3>
                    <button
                        onClick={fetchTransactions}
                        disabled={loading}
                        className="text-sm px-3 py-1 border rounded hover:bg-slate-100"
                    >
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
                <div className="p-0 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Time</th>
                                <th className="px-4 py-3">Model</th>
                                <th className="px-4 py-3 text-right">In / Out</th>
                                <th className="px-4 py-3 text-right">Cost ($)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        No transactions found. Run Test 2.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-slate-600">
                                            {new Date(tx.createdAt).toLocaleTimeString()}
                                        </td>
                                        <td className="px-4 py-3 font-medium">{tx.model}</td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {tx.inputTokens} / {tx.outputTokens}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-green-600 font-bold">
                                            ${tx.totalCost.toFixed(6)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
