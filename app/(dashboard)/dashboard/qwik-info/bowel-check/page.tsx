"use client";

import { useState, useEffect, useMemo } from 'react';
import { useProfile } from '@/hooks/use-profile';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, AlertTriangle, Activity, Calendar, Loader2, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type BowelCheckData = {
  residentId: string;
  name: string;
  roomNumber: string;
  lastBowelDate?: string | null;
  lastBowelTime?: string | null;
  daysSinceLastBowel: number;
  bowelCountLast7Days: number;
  bowelCountLast30Days: number;
  status: 'normal' | 'monitor' | 'alert' | 'critical' | 'no-data';
  lastBowelType?: string | null;
};

type SortKey = 'name' | 'roomNumber' | 'daysSinceLastBowel' | 'bowelCountLast7Days';

export default function BowelCheckPage() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const [bowelData, setBowelData] = useState<BowelCheckData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('daysSinceLastBowel');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeTeamId = profile?.active_team_id;

  const fetchBowelCheckData = async () => {
    if (!activeTeamId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/qwik-info/bowel-checks?teamId=${activeTeamId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch bowel check data');
      }

      const result = await response.json();
      setBowelData(result.data || []);
    } catch (error) {
      console.error('Error fetching bowel check data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load bowel check data';
      setError(errorMessage);
      setBowelData([]);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchBowelCheckData();
  }, [activeTeamId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchBowelCheckData();
    toast.success('Data refreshed successfully');
  };

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: bowelData.length,
      critical: bowelData.filter(r => r.status === 'critical').length,
      alert: bowelData.filter(r => r.status === 'alert').length,
      monitor: bowelData.filter(r => r.status === 'monitor').length,
      normal: bowelData.filter(r => r.status === 'normal').length,
      noData: bowelData.filter(r => r.status === 'no-data').length,
    };
  }, [bowelData]);

  // Filter and search
  const filteredData = useMemo(() => {
    let filtered = bowelData;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.roomNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    return filtered;
  }, [bowelData, searchQuery, filterStatus]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortKey) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'roomNumber':
          aValue = a.roomNumber || '';
          bValue = b.roomNumber || '';
          break;
        case 'daysSinceLastBowel':
          aValue = a.daysSinceLastBowel;
          bValue = b.daysSinceLastBowel;
          break;
        case 'bowelCountLast7Days':
          aValue = a.bowelCountLast7Days;
          bValue = b.bowelCountLast7Days;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Critical (5+ days)</Badge>;
      case 'alert':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Alert (3-4 days)</Badge>;
      case 'monitor':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Monitor (2 days)</Badge>;
      case 'normal':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Normal</Badge>;
      case 'no-data':
        return <Badge variant="outline">No Data</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeTeamId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Team</h2>
          <p className="text-gray-500">Please select a team/unit to view bowel movement data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Bowel Movement Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Unit-wide bowel movement tracking for all residents
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error loading data</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-blue-700">Total</p>
                <p className="text-xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-red-700">Critical (5+)</p>
                <p className="text-xl font-bold text-red-900">{stats.critical}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-orange-700">Alert (3-4)</p>
                <p className="text-xl font-bold text-orange-900">{stats.alert}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-yellow-700">Monitor (2)</p>
                <p className="text-xl font-bold text-yellow-900">{stats.monitor}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-green-700">Normal</p>
                <p className="text-xl font-bold text-green-900">{stats.normal}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg">
                <Activity className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-gray-700">No Data</p>
                <p className="text-xl font-bold text-gray-900">{stats.noData}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg">
                <Calendar className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilterStatus('all')}
              >
                All ({stats.total})
              </Badge>
              <Badge
                variant={filterStatus === 'critical' ? 'default' : 'outline'}
                className="cursor-pointer bg-red-100 text-red-800 hover:bg-red-200"
                onClick={() => setFilterStatus('critical')}
              >
                Critical ({stats.critical})
              </Badge>
              <Badge
                variant={filterStatus === 'alert' ? 'default' : 'outline'}
                className="cursor-pointer bg-orange-100 text-orange-800 hover:bg-orange-200"
                onClick={() => setFilterStatus('alert')}
              >
                Alert ({stats.alert})
              </Badge>
              <Badge
                variant={filterStatus === 'monitor' ? 'default' : 'outline'}
                className="cursor-pointer bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                onClick={() => setFilterStatus('monitor')}
              >
                Monitor ({stats.monitor})
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSort('name')}
                  >
                    Resident Name {sortKey === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSort('roomNumber')}
                  >
                    Room {sortKey === 'roomNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSort('daysSinceLastBowel')}
                  >
                    Days Since Last BM {sortKey === 'daysSinceLastBowel' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Last BM Date</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSort('bowelCountLast7Days')}
                  >
                    Last 7 Days {sortKey === 'bowelCountLast7Days' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Last 30 Days</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchQuery || filterStatus !== 'all'
                        ? 'No residents match the current filters'
                        : 'No resident data available'}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((resident) => (
                    <TableRow
                      key={resident.residentId}
                      className={cn(
                        'hover:bg-gray-50',
                        resident.status === 'critical' && 'bg-red-50/50',
                        resident.status === 'alert' && 'bg-orange-50/50'
                      )}
                    >
                      <TableCell className="font-medium">{resident.name}</TableCell>
                      <TableCell>{resident.roomNumber || '—'}</TableCell>
                      <TableCell>
                        {resident.status === 'no-data' ? (
                          <span className="text-gray-400 text-sm">No data</span>
                        ) : resident.daysSinceLastBowel === 0 ? (
                          <span className="font-semibold text-green-600">
                            Done today{resident.lastBowelTime ? ` at ${resident.lastBowelTime}` : ''}
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'font-semibold',
                              resident.daysSinceLastBowel >= 5 && 'text-red-600',
                              resident.daysSinceLastBowel >= 3 && resident.daysSinceLastBowel < 5 && 'text-orange-600',
                              resident.daysSinceLastBowel === 2 && 'text-yellow-600',
                              resident.daysSinceLastBowel < 2 && 'text-green-600'
                            )}
                          >
                            {resident.daysSinceLastBowel} {resident.daysSinceLastBowel === 1 ? 'day' : 'days'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {resident.lastBowelDate ? (
                          <div className="text-sm">
                            <div>
                              {(() => {
                                try {
                                  const date = parseISO(resident.lastBowelDate);
                                  return isValid(date) ? format(date, 'MMM d, yyyy') : resident.lastBowelDate;
                                } catch {
                                  return resident.lastBowelDate;
                                }
                              })()}
                            </div>
                            {resident.lastBowelTime && (
                              <div className="text-xs text-gray-500">{resident.lastBowelTime}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{resident.bowelCountLast7Days}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{resident.bowelCountLast30Days}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(resident.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
