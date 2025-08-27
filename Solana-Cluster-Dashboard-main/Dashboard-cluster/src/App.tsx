// import React, { useState, useEffect } from 'react';
// import "./App.css"

// interface Cluster {
//   funding_wallet: string;
//   recipients: string[];
//   token_mint: string | null;
//   fan_out_slot: number;
//   buy_slots: number[];
//   common_patterns: {
//     amounts: string;
//     wallet_age: string;
//     dex_programs: string[];
//   };
//   total_sol_funded: number;
//   total_sol_remaining: number | null;
//   spend_rate_sol_per_min: number | null;
//   time_remaining_sec: number | null;
//   last_update: number;
//   cluster_age_sec?: number;
//   children_count?: number;
// }

// interface ApiResponse {
//   clusters: Cluster[];
//   metadata: {
//     total_active: number;
//     total_tracked: number;
//     timestamp: string;
//     requirements: {
//       min_children: number;
//       min_total_sol: number;
//       min_transfer_sol: number;
//       detection_window_sec: number;
//       data_retention_min: number;
//     };
//   };
// }

// const App: React.FC = () => {
//   const [data, setData] = useState<ApiResponse | null>(null);
//   const [loading, setLoading] = useState<boolean>(true);
 
//   const [error, setError] = useState<string>('');
//   const [selectedRecipients, setSelectedRecipients] = useState<string[] | null>(null);

//   const fetchData = async (): Promise<void> => {
//     try {
//       setError('');
//       const response = await fetch('http://localhost:3001/clusters');
      
//       if (!response.ok) {
//         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
//       }
      
//       const result: ApiResponse = await response.json();
//       setData(result);
    
//       setLoading(false);
//     } catch (error: any) {
//       console.error('Error fetching clusters:', error);
//       setError(error.message || 'Failed to fetch data');
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//     const interval = setInterval(fetchData, 5000);
//     return () => clearInterval(interval);
//   }, []);

//   const formatTimeRemaining = (seconds: number | null): string => {
//     if (seconds === null || seconds <= 0) return 'N/A';
    
//     if (seconds < 60) return `${seconds}s`;
//     if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    
//     const hours = Math.floor(seconds / 3600);
//     const minutes = Math.floor((seconds % 3600) / 60);
//     return `${hours}h ${minutes}m`;
//   };

//   const getStatusColor = (cluster: Cluster): string => {
//     if (!cluster.total_sol_remaining) return 'text-gray-500';
//     if (cluster.total_sol_remaining < 1) return 'text-red-500';
//     if (cluster.total_sol_remaining < 5) return 'text-yellow-500';
//     return 'text-green-500';
//   };

//   const handleShowRecipients = (recipients: string[]) => {
//     setSelectedRecipients(recipients);
//   };

//   const handleCloseModal = () => {
//     setSelectedRecipients(null);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-100 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Loading clusters...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-gray-100 flex items-center justify-center">
//         <div className="text-center bg-white p-8 rounded-lg shadow-lg">
//           <div className="text-red-500 text-xl mb-4">⚠️ Connection Error</div>
//           <p className="text-gray-600 mb-4">{error}</p>
//           <button 
//             onClick={fetchData}
//             className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//           >
//             Retry
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-100">
//       <div className="container mx-auto px-4 py-8">
//         <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
//           <h1 className="text-3xl font-bold text-gray-800 mb-4">
//             🚀 Solana Cluster Monitor - MAINNET
//           </h1>
          
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//             <div className="bg-blue-50 p-4 rounded-lg">
//               <div className="text-blue-600 font-semibold">Active Clusters</div>
//               <div className="text-2xl font-bold text-blue-800">
//                 {data?.metadata.total_active || 0}
//               </div>
//             </div>
//             <div className="bg-green-50 p-4 rounded-lg">
//               <div className="text-green-600 font-semibold">Requirements</div>
//               <div className="text-sm text-green-800">
//                 ≥5 children, ≥20 SOL, ≥1 SOL/transfer
//               </div>
//             </div>
//             <div className="bg-purple-50 p-4 rounded-lg">
//               <div className="text-purple-600 font-semibold">Detection Window</div>
//               <div className="text-lg font-bold text-purple-800">10 seconds</div>
//             </div>
//             <div className="bg-orange-50 p-4 rounded-lg">
//               <div className="text-orange-600 font-semibold">Update Frequency</div>
//               <div className="text-sm text-orange-800">
//                 5s refresh • 15s balance updates
//               </div>
//             </div>
//           </div>

//           <div className="text-sm text-gray-600 mb-4">
//             📡 Live data • 🔗 Click addresses to verify on Solscan • 
//             🔄 Auto-refresh every 5s • 🆕 <strong>Newest clusters shown first</strong> • 
//             ⚡ Real-time balance tracking
//           </div>
//         </div>

//         {data?.clusters.length === 0 ? (
//           <div className="bg-white rounded-lg shadow-lg p-8 text-center">
//             <div className="text-gray-500 text-xl mb-4">📊 No Active Clusters</div>
//             <p className="text-gray-600 mb-4">
//               No clusters found matching requirements. Monitoring for fast funding patterns...
//             </p>
//             <div className="text-sm text-blue-600">
//               🔍 Scanning every 2 seconds for clusters with ≥5 wallets, ≥20 SOL, ≥1 SOL/transfer
//             </div>
//           </div>
//         ) : (
//           <div className="bg-white rounded-lg shadow-lg overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="min-w-full">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Funding Wallet
//                     </th>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Children Count
//                     </th>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Total SOL Funded
//                     </th>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       SOL Remaining
//                     </th>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Spend Rate
//                     </th>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Time Left
//                     </th>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Cluster Age
//                     </th>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Fan Out Slot
//                     </th>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Recipients Sample
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {data?.clusters.map((cluster, index) => (
//                     <tr key={cluster.funding_wallet} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
//                       <td className="px-4 py-4 whitespace-nowrap">
//                         <a
//                           href={`https://solscan.io/account/${cluster.funding_wallet}`}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="text-blue-600 hover:text-blue-800 font-mono text-sm"
//                         >
//                           {cluster.funding_wallet.slice(0, 8)}...{cluster.funding_wallet.slice(-4)}
//                         </a>
//                       </td>
                      
//                       <td className="px-4 py-4 whitespace-nowrap">
//                         <div className="flex items-center">
//                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
//                             {cluster.children_count || cluster.recipients.length}
//                           </span>
//                         </div>
//                       </td>

//                       <td className="px-4 py-4 whitespace-nowrap">
//                         <div className="text-sm font-medium text-gray-900">
//                           {cluster.total_sol_funded.toFixed(3)} SOL
//                         </div>
//                         <div className="text-xs text-gray-500">
//                           ~{(cluster.total_sol_funded / (cluster.children_count || cluster.recipients.length)).toFixed(2)} per child
//                         </div>
//                       </td>

//                       <td className="px-4 py-4 whitespace-nowrap">
//                         <div className={`text-sm font-medium ${getStatusColor(cluster)}`}>
//                           {cluster.total_sol_remaining !== null && cluster.total_sol_remaining !== undefined
//                             ? `${cluster.total_sol_remaining.toFixed(6)} SOL`
//                             : 'Calculating...'
//                           }
//                         </div>
//                         {cluster.total_sol_remaining !== null && cluster.total_sol_remaining === 0 && (
//                           <div className="text-xs text-red-500">⚠️ Depleted</div>
//                         )}
//                       </td>

//                       <td className="px-4 py-4 whitespace-nowrap">
//                         <div className="text-sm text-gray-900">
//                           {cluster.spend_rate_sol_per_min && cluster.spend_rate_sol_per_min > 0
//                             ? `${cluster.spend_rate_sol_per_min.toFixed(4)} SOL/min` 
//                             : 'Calculating...'
//                           }
//                         </div>
//                         {cluster.spend_rate_sol_per_min && cluster.spend_rate_sol_per_min > 0 && (
//                           <div className="text-xs text-gray-500">
//                             {(cluster.spend_rate_sol_per_min * 60).toFixed(2)} SOL/hr
//                           </div>
//                         )}
//                       </td>

//                       <td className="px-4 py-4 whitespace-nowrap">
//                         <div className="text-sm font-medium text-gray-900">
//                           {formatTimeRemaining(cluster.time_remaining_sec)}
//                         </div>
//                         {cluster.time_remaining_sec && cluster.time_remaining_sec < 3600 && (
//                           <div className="text-xs text-orange-500">⏰ Soon</div>
//                         )}
//                       </td>

//                       <td className="px-4 py-4 whitespace-nowrap">
//                         <div className="text-sm text-gray-900">
//                           {cluster.cluster_age_sec ? `${cluster.cluster_age_sec}s` : 'N/A'}
//                         </div>
//                         <div className="text-xs text-gray-500">
//                           (Fast detected)
//                         </div>
//                       </td>

//                       <td className="px-4 py-4 whitespace-nowrap">
//                         <a
//                           href={`https://solscan.io/block/${cluster.fan_out_slot}`}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="text-blue-600 hover:text-blue-800 text-sm"
//                         >
//                           {cluster.fan_out_slot}
//                         </a>
//                       </td>

//                       <td className="px-4 py-4">
//                         <div className="text-xs space-y-1 max-w-xs">
//                           {cluster.recipients.slice(0, 3).map((recipient, idx) => (
//                             <div key={idx}>
//                               <a
//                                 href={`https://solscan.io/account/${recipient}`}
//                                 target="_blank"
//                                 rel="noopener noreferrer"
//                                 className="text-blue-600 hover:text-blue-800 font-mono"
//                               >
//                                 {recipient.slice(0, 6)}...{recipient.slice(-4)}
//                               </a>
//                             </div>
//                           ))}
//                           {cluster.recipients.length > 3 && (
//                             <div className="text-gray-500 text-xs">
//                               <button
//                                 onClick={() => handleShowRecipients(cluster.recipients)}
//                                 className="mt-1 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
//                               >
//                                 Show All ({cluster.recipients.length})
//                               </button>
//                             </div>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}

//         {selectedRecipients && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
//               <div className="flex justify-between items-center mb-4">
//                 <h2 className="text-xl font-bold text-gray-800">All Recipients</h2>
//                 <button
//                   onClick={handleCloseModal}
//                   className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
//                 >
//                   &times;
//                 </button>
//               </div>
//               <div className="space-y-2">
//                 {selectedRecipients.map((recipient, idx) => (
//                   <div key={idx} className="text-sm">
//                     <a
//                       href={`https://solscan.io/account/${recipient}`}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className="text-blue-600 hover:text-blue-800 font-mono break-all"
//                     >
//                       {recipient}
//                     </a>
//                   </div>
//                 ))}
//               </div>
//               <div className="mt-4 flex justify-end">
//                 <button
//                   onClick={handleCloseModal}
//                   className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//                 >
//                   Close
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}

//         <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
//           <div className="text-sm text-gray-600 space-y-2">
//             <div><strong>Monitor Status:</strong> Active on Solana Mainnet</div>
//             <div><strong>Detection Criteria:</strong> Minimum 5 recipients, 20+ SOL total funding, 1+ SOL per transfer</div>
//             <div><strong>Time Window:</strong> Transactions must occur within 10 seconds (fast funding detection)</div>
//             <div><strong>Data Retention:</strong> Clusters older than 30 minutes are automatically removed</div>
//             <div><strong>Update Frequency:</strong> Real-time polling every 2 seconds, balance updates every 30 seconds</div>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default App;


// // src/App.tsx
// import React, { useEffect, useState } from 'react';
// import './App.css';

// interface Cluster {
//   funding_wallet: string;
//   recipients: string[];
//   token_mints: string[];
//   fan_out_slot: number;
//   buy_slots: number[];
//   common_patterns: {
//     amounts: string;
//     wallet_age: string;
//     dex_programs: string[];
//   };
//   total_sol_funded: number;
//   total_sol_remaining: number;
//   spend_rate_sol_per_min: number | null;
//   time_remaining_sec: number | null;
//   last_update: number;
//   cluster_age_sec: number;
//   children_count: number;
//   created_at: number;
//   status: 'active' | 'forming';
// }

// interface ApiResponse {
//   clusters: Cluster[];
//   metadata: {
//     total_active: number;
//     total_tracked: number;
//     timestamp: string;
//     requirements: {
//       min_children: number;
//       min_total_sol: number;
//       min_transfer_sol: number;
//       detection_window_sec: number;
//       data_retention_min: number;
//     };
//   };
// }

// const App: React.FC = () => {
//   const [data, setData] = useState<ApiResponse | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'forming'>('all');

//   const fetchData = async () => {
//     try {
//       const response = await fetch('http://localhost:3001/clusters');
//       if (!response.ok) {
//         throw new Error('Failed to fetch clusters');
//       }
//       const json: ApiResponse = await response.json();
//       setData(json);
//       setLoading(false);
//     } catch (err) {
//       setError((err as Error).message);
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//     const interval = setInterval(fetchData, 10000); // Refresh every 10s
//     return () => clearInterval(interval);
//   }, []);

//   const filteredClusters = data?.clusters.filter(cluster => {
//     const matchesSearch = cluster.funding_wallet.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesStatus = statusFilter === 'all' || cluster.status === statusFilter;
//     return matchesSearch && matchesStatus;
//   }) || [];

//   if (loading) return <div className="loading">Loading Solana Cluster Dashboard...</div>;
//   if (error) return <div className="error">Error: {error}</div>;

//   return (
//     <div className="app">
//       <header className="header">
//         <h1>Solana Funding Cluster Dashboard</h1>
//         <p>Real-time monitoring of active funding clusters (≥5 children, ≥20 SOL total, 10s window). Total Active: {data?.metadata.total_active} | Tracked: {data?.metadata.total_tracked} | Last Updated: {new Date(data?.metadata.timestamp || '').toLocaleString()}</p>
//       </header>
//       <div className="controls">
//         <input
//           type="text"
//           placeholder="Search by Funding Wallet..."
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//           className="search-input"
//         />
//         <select
//           value={statusFilter}
//           onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'forming')}
//           className="status-filter"
//         >
//           <option value="all">All Statuses</option>
//           <option value="active">Active Only</option>
//           <option value="forming">Forming Only</option>
//         </select>
//       </div>
//       <div className="table-container">
//         <table className="cluster-table">
//           <thead>
//             <tr>
//               <th>Funding Wallet</th>
//               <th>Children Count</th>
//               <th>Total Funded SOL</th>
//               <th>Remaining SOL</th>
//               <th>Spend Rate (SOL/min)</th>
//               <th>Time Remaining (sec)</th>
//               <th>Token Mints</th>
//               <th>DEX Programs</th>
//               <th>Status</th>
//               <th>Age (sec)</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filteredClusters.length === 0 ? (
//               <tr><td colSpan={10} className="no-data">No clusters match your filters</td></tr>
//             ) : (
//               filteredClusters.map((cluster, index) => (
//                 <tr key={index} className="cluster-row">
//                   <td>{cluster.funding_wallet.slice(0, 6)}...{cluster.funding_wallet.slice(-4)}</td>
//                   <td>{cluster.children_count}</td>
//                   <td>{cluster.total_sol_funded.toFixed(2)}</td>
//                   <td className={cluster.total_sol_remaining < 1 ? 'low-remaining' : ''}>{cluster.total_sol_remaining.toFixed(2)}</td>
//                   <td>{cluster.spend_rate_sol_per_min?.toFixed(2) ?? 'N/A'}</td>
//                   <td>{cluster.time_remaining_sec ?? 'N/A'}</td>
//                   <td>{cluster.token_mints.join(', ') || 'None'}</td>
//                   <td>{cluster.common_patterns.dex_programs.join(', ') || 'None'}</td>
//                   <td className={`status-${cluster.status}`}>{cluster.status.toUpperCase()}</td>
//                   <td>{cluster.cluster_age_sec}</td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// export default App;

// src/App.tsx
import React, { useEffect, useState } from 'react';
import './App.css';

interface Cluster {
  funding_wallet: string;
  recipients: string[];
  token_mints: string[];
  fan_out_slot: number;
  buy_slots: number[];
  common_patterns: {
    amounts: string;
    wallet_age: string;
    dex_programs: string[];
  };
  total_sol_funded: number;
  total_sol_remaining: number;
  spend_rate_sol_per_min: number | null;
  time_remaining_sec: number | null;
  last_update: number;
  cluster_age_sec: number;
  children_count: number;
  created_at: number;
  status: 'active' | 'forming';
}

interface ApiResponse {
  clusters: Cluster[];
  metadata: {
    total_active: number;
    total_tracked: number;
    timestamp: string;
    requirements: {
      min_children: number;
      min_total_sol: number;
      min_transfer_sol: number;
      detection_window_sec: number;
      data_retention_min: number;
    };
  };
}

const App: React.FC = () => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'forming'>('all');
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:3001/clusters');
      if (!response.ok) {
        throw new Error('Failed to fetch clusters');
      }
      const json: ApiResponse = await response.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s for faster updates
    return () => clearInterval(interval);
  }, []);

  const filteredClusters = data?.clusters.filter(cluster => {
    const matchesSearch = cluster.funding_wallet.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cluster.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Solana Funding Cluster Dashboard</h1>
        <p>Real-time monitoring of active funding clusters (≥5 children, ≥20 SOL total, 10s window). Total Active: {data?.metadata.total_active} | Tracked: {data?.metadata.total_tracked} | Last Updated: {new Date(data?.metadata.timestamp || '').toLocaleString()}</p>
      </header>
      <div className="controls">
        <input
          type="text"
          placeholder="Search by Funding Wallet..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'forming')}
          className="status-filter"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="forming">Forming Only</option>
        </select>
      </div>
      <div className="table-container">
        <table className="cluster-table">
          <thead>
            <tr>
              <th>Funding Wallet</th>
              <th>Children</th>
              <th>Total Funded SOL</th>
              <th>Remaining SOL</th>
              <th>Spend Rate (SOL/min)</th>
              <th>Time Remaining (sec)</th>
              <th>Token Mints</th>
              <th>DEX Programs</th>
              <th>Fan Out Slot</th>
              <th>Status</th>
              <th>Age (sec)</th>
            </tr>
          </thead>
          <tbody>
            {filteredClusters.length === 0 ? (
              <tr><td colSpan={11} className="no-data">No clusters match your filters</td></tr>
            ) : (
              filteredClusters.map((cluster, index) => (
                <tr key={index} className="cluster-row">
                  <td>{cluster.funding_wallet.slice(0, 6)}...{cluster.funding_wallet.slice(-4)}</td>
                  <td>
                    {cluster.children_count}{' '}
                    <button
                      className="view-children-btn"
                      onClick={() => setSelectedCluster(cluster)}
                    >
                      View Children
                    </button>
                  </td>
                  <td>{cluster.total_sol_funded.toFixed(2)}</td>
                  <td className={cluster.total_sol_remaining < 1 ? 'low-remaining' : ''}>{cluster.total_sol_remaining.toFixed(2)}</td>
                  <td>{cluster.spend_rate_sol_per_min?.toFixed(2) ?? 'N/A'}</td>
                  <td>{cluster.time_remaining_sec ?? 'N/A'}</td>
                  <td>{cluster.token_mints.join(', ') || 'None'}</td>
                  <td>{cluster.common_patterns.dex_programs.join(', ') || 'None'}</td>
                  <td>{cluster.fan_out_slot}</td>
                  <td className={`status-${cluster.status}`}>{cluster.status.toUpperCase()}</td>
                  <td>{cluster.cluster_age_sec}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedCluster && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Child Addresses for {selectedCluster.funding_wallet.slice(0, 6)}...{selectedCluster.funding_wallet.slice(-4)}</h2>
            <div className="child-addresses">
              {selectedCluster.recipients.map((address, idx) => (
                <div key={idx} className="child-address">
                  <span>{address}</span>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(address)}
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
            <button
              className="close-btn"
              onClick={() => setSelectedCluster(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;