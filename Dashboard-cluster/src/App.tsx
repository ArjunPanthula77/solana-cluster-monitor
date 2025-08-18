import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Define the Cluster interface
interface Cluster {
  funding_wallet: string;
  recipients: string[];
  token_mint: string | null;
  fan_out_slot: number;
  buy_slots: number[];
  common_patterns: {
    amounts: string;
    wallet_age: string;
    dex_programs: string[];
  };
  total_sol_funded: number | null;
  total_sol_remaining: number | null;
  spend_rate_sol_per_min: number | null;
  time_remaining_sec: number | null;
  last_update: number;
}

const App: React.FC = () => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        const response = await axios.get<Cluster[]>('https://solana-cluster-monitor-production.up.railway.app/clusters');
        setClusters(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching clusters:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000 ); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="App loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <h1>Solana Cluster Dashboard</h1>
      <p className="info">
        Live data from API at{' '}
        <a href="https://solana-cluster-monitor-production.up.railway.app/clusters" target="_blank" rel="noopener noreferrer">
          /clusters
        </a>
        . Click wallets/slots/recipients to verify on Solscan.
      </p>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Funding Wallet (Verify)</th>
              <th>Total SOL Funded</th>
              <th>Total SOL Remaining</th>
              <th>Time Remaining (sec)</th>
              <th>DEX Programs</th>
              <th>Fan Out Slot (Verify)</th>
              <th>Buy Slots</th>
              <th>Amounts</th>
              <th>Wallet Age</th>
              <th>Recipients (Verify)</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            {clusters.map((cluster) => (
              <tr key={cluster.funding_wallet}>
                <td>
                  <a
                    href={`https://solscan.io/account/${cluster.funding_wallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {cluster.funding_wallet.slice(0, 6)}...
                  </a>
                </td>
                <td>{cluster.total_sol_funded?.toFixed(6) || 'N/A'} SOL</td>
                <td>{cluster.total_sol_remaining?.toFixed(6) || 'N/A'} SOL</td>
                <td>{cluster.time_remaining_sec !== null ? `${cluster.time_remaining_sec} sec` : 'N/A'}</td>
                <td>{cluster.common_patterns.dex_programs.join(', ') || 'None'}</td>
                <td>
                  <a
                    href={`https://solscan.io/block/${cluster.fan_out_slot}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {cluster.fan_out_slot}
                  </a>
                </td>
                <td>{cluster.buy_slots.join(', ') || 'None'}</td>
                <td>{cluster.common_patterns.amounts}</td>
                <td>{cluster.common_patterns.wallet_age}</td>
                <td>
                  {cluster.recipients.slice(0, 5).map((recipient, index) => (
                    <span key={index}>
                      <a
                        href={`https://solscan.io/account/${recipient}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {recipient.slice(0, 6)}...
                      </a>
                      {index < Math.min(4, cluster.recipients.length - 1) ? ', ' : cluster.recipients.length > 5 ? '...' : ''}
                    </span>
                  ))}
                  {cluster.recipients.length > 5 && ` (+${cluster.recipients.length - 5} more)`}
                </td>
                <td>{new Date(cluster.last_update).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;