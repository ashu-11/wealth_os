import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Pill, Avatar, Spinner, Empty, formatINR, formatPct } from '../components/UI';
import { useFetch, auth } from '../hooks/useFetch';

export default function Team() {
  const navigate = useNavigate();
  const user = auth.getUser();
  
  const { data: team, loading } = useFetch('/team');
  const { data: hierarchy } = useFetch('/team/hierarchy/tree');
  
  // Check if user has team access
  if (!['ASM', 'BM', 'RSM', 'ADMIN'].includes(user?.role)) {
    return (
      <div className="p-4">
        <Empty
          icon="👥"
          title="Team View"
          description="This view is available for managers (ASM, BM, RSM)"
        />
      </div>
    );
  }
  
  return (
    <div className="pb-20 md:pb-4">
      {/* Header */}
      <div className="px-4 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <h1 className="text-xl font-bold">Your Team</h1>
        <p className="text-blue-200 text-sm mt-1">
          {user?.role} · {user?.regionCode} {user?.branchCode ? `/ ${user.branchCode}` : ''}
        </p>
        {team && (
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-blue-200 text-xs">Members</p>
              <p className="text-2xl font-bold">{team.length}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs">Total AUM</p>
              <p className="text-2xl font-bold">
                {formatINR(team.reduce((acc, m) => acc + (m.stats?.totalAum || 0), 0), true)}
              </p>
            </div>
            <div>
              <p className="text-blue-200 text-xs">At Risk</p>
              <p className="text-2xl font-bold">
                {team.reduce((acc, m) => acc + (m.stats?.churnCount || 0), 0)}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Team List */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : !team || team.length === 0 ? (
          <Empty
            icon="👥"
            title="No team members"
            description="No RMs assigned to you yet"
          />
        ) : (
          team.map(member => (
            <Card
              key={member._id}
              className="p-4"
              onClick={() => navigate(`/team/${member._id}`)}
            >
              <div className="flex items-start gap-3">
                <Avatar name={member.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatPct(member.stats?.targetProgress || 0)}
                      </p>
                      <p className="text-xs text-gray-500">of target</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div>
                      <p className="text-xs text-gray-500">Customers</p>
                      <p className="text-sm font-semibold">{member.stats?.customerCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">AUM</p>
                      <p className="text-sm font-semibold">{formatINR(member.stats?.totalAum, true)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">SIP Book</p>
                      <p className="text-sm font-semibold">{formatINR(member.stats?.totalSip, true)}</p>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          (member.stats?.targetProgress || 0) >= 100 
                            ? 'bg-green-500' 
                            : (member.stats?.targetProgress || 0) >= 75 
                              ? 'bg-blue-500' 
                              : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, member.stats?.targetProgress || 0)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Alerts */}
                  {(member.stats?.churnCount > 0 || member.stats?.alertCount > 0) && (
                    <div className="flex gap-2 mt-3">
                      {member.stats?.churnCount > 0 && (
                        <Pill variant="danger" size="xs">
                          🔥 {member.stats.churnCount} at risk
                        </Pill>
                      )}
                      {member.stats?.alertCount > 0 && (
                        <Pill variant="warning" size="xs">
                          🔔 {member.stats.alertCount} alerts
                        </Pill>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-gray-400">→</div>
              </div>
            </Card>
          ))
        )}
      </div>
      
      {/* Hierarchy Tree (if available) */}
      {hierarchy && (
        <div className="px-4 py-4">
          <h3 className="font-semibold text-gray-900 mb-3">Hierarchy</h3>
          <Card className="p-4">
            <HierarchyNode node={hierarchy} />
          </Card>
        </div>
      )}
    </div>
  );
}

function HierarchyNode({ node, level = 0 }) {
  if (!node) return null;
  
  return (
    <div style={{ marginLeft: level * 16 }}>
      <div className="flex items-center gap-2 py-1">
        {level > 0 && <span className="text-gray-300">└</span>}
        <Avatar name={node.name} size="sm" />
        <div>
          <p className="text-sm font-medium text-gray-900">{node.name}</p>
          <p className="text-xs text-gray-500">{node.role}</p>
        </div>
      </div>
      {node.children?.map(child => (
        <HierarchyNode key={child._id} node={child} level={level + 1} />
      ))}
    </div>
  );
}
