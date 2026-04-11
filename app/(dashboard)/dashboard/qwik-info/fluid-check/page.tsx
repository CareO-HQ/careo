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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Search, AlertTriangle, Activity, Loader2, RefreshCw, AlertCircle, Droplets, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type FluidCheckData = {
  residentId: string;
  name: string;
  roomNumber: string;
  fluidTarget: number | null;
  todayIntake: number;
  yesterdayIntake: number;
  last7DaysAverage: number;
  last7DaysTotal: number;
  progressPercentage: number;
  status: 'excellent' | 'good' | 'low' | 'critical' | 'no-target';
  trend: 'up' | 'down' | 'stable';
};

type SortKey = 'name' | 'roomNumber' | 'todayIntake' | 'progressPercentage' | 'last7DaysAverage';

export default function FluidCheckPage() {
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const [fluidData, setFluidData] = useState<FluidCheckData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('progressPercentage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeTeamId = profile?.active_team_id;

  const fetchFluidCheckData = async () => {
    if (!activeTeamId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/qwik-info/fluid-checks?teamId=${activeTeamId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch fluid check data');
      }

      const result = await response.json();
      setFluidData(result.data || []);
    } catch (error) {
      console.error('Error fetching fluid check data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load fluid check data';
      setError(errorMessage);
      setFluidData([]);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchFluidCheckData();
  }, [activeTeamId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchFluidCheckData();
    toast.success('Data refreshed successfully');
  };

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: fluidData.length,
      excellent: fluidData.filter(r => r.status === 'excellent').length,
      good: fluidData.filter(r => r.status === 'good').length,
      low: fluidData.filter(r => r.status === 'low').length,
      critical: fluidData.filter(r => r.status === 'critical').length,
      noTarget: fluidData.filter(r => r.status === 'no-target').length,
    };
  }, [fluidData]);

  // Filter and search
  const filteredData = useMemo(() => {
    let filtered = fluidData;

    if (searchQuery) {
      filtered = filtered.filter(item =>
        (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.roomNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    return filtered;
  }, [fluidData, searchQuery, filterStatus]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortKey) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'roomNumber':
          aValue = a.roomNumber || '';
          bValue = b.roomNumber || '';
          break;
        case 'todayIntake':
          aValue = a.todayIntake;
          bValue = b.todayIntake;
          break;
        case 'progressPercentage':
          aValue = a.progressPercentage;
          bValue = b.progressPercentage;
          break;
        case 'last7DaysAverage':
          aValue = a.last7DaysAverage;
          bValue = b.last7DaysAverage;
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
      case 'excellent':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Excellent (90%+)</Badge>;
      case 'good':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Good (70-89%)</Badge>;
      case 'low':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Low (50-69%)</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Critical (&lt;50%)</Badge>;
      case 'no-target':
        return <Badge variant="outline">No Target Set</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
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
          <p className="text-gray-500">Please select a team/unit to view fluid intake data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Fluid Intake Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Unit-wide fluid intake tracking for all residents
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

        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-emerald-700">Excellent (90%+)</p>
                <p className="text-xl font-bold text-emerald-900">{stats.excellent}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg">
                <Droplets className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-green-700">Good (70-89%)</p>
                <p className="text-xl font-bold text-green-900">{stats.good}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg">
                <Droplets className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-orange-700">Low (50-69%)</p>
                <p className="text-xl font-bold text-orange-900">{stats.low}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-red-700">Critical (&lt;50%)</p>
                <p className="text-xl font-bold text-red-900">{stats.critical}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-gray-700">No Target</p>
                <p className="text-xl font-bold text-gray-900">{stats.noTarget}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg">
                <Droplets className="w-4 h-4 text-gray-600" />
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
                variant={filterStatus === 'low' ? 'default' : 'outline'}
                className="cursor-pointer bg-orange-100 text-orange-800 hover:bg-orange-200"
                onClick={() => setFilterStatus('low')}
              >
                Low ({stats.low})
              </Badge>
              <Badge
                variant={filterStatus === 'good' ? 'default' : 'outline'}
                className="cursor-pointer bg-green-100 text-green-800 hover:bg-green-200"
                onClick={() => setFilterStatus('good')}
              >
                Good ({stats.good})
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
                  <TableHead>Target</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSort('todayIntake')}
                  >
                    Today's Intake {sortKey === 'todayIntake' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSort('progressPercentage')}
                  >
                    Progress {sortKey === 'progressPercentage' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSort('last7DaysAverage')}
                  >
                    Last 7 Days Avg {sortKey === 'last7DaysAverage' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {searchQuery || filterStatus !== 'all'
                        ? 'No residents match the current filters'
                        : 'No resident data available'}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((resident) => (
                    <TableRow
                      key={resident.residentId}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/dashboard/residents/${resident.residentId}/food-fluid`)}
                    >
                      <TableCell className="font-medium">{resident.name}</TableCell>
                      <TableCell>{resident.roomNumber || 'N/A'}</TableCell>
                      <TableCell>
                        {resident.fluidTarget ? (
                          <span className="font-semibold">{resident.fluidTarget}ml</span>
                        ) : (
                          <span className="text-gray-400 text-sm">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'font-semibold',
                            resident.status === 'excellent' && 'text-emerald-600',
                            resident.status === 'good' && 'text-green-600',
                            resident.status === 'low' && 'text-orange-600',
                            resident.status === 'critical' && 'text-red-600',
                            resident.status === 'no-target' && 'text-gray-600'
                          )}
                        >
                          {resident.todayIntake}ml
                        </span>
                      </TableCell>
                      <TableCell>
                        {resident.fluidTarget ? (
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={cn(
                                  'h-2 rounded-full transition-all',
                                  resident.progressPercentage >= 90 && 'bg-emerald-600',
                                  resident.progressPercentage >= 70 && resident.progressPercentage < 90 && 'bg-green-600',
                                  resident.progressPercentage >= 50 && resident.progressPercentage < 70 && 'bg-orange-600',
                                  resident.progressPercentage < 50 && 'bg-red-600'
                                )}
                                style={{ width: `${Math.min(resident.progressPercentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{resident.progressPercentage}%</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{resident.last7DaysAverage}ml</span>
                      </TableCell>
                      <TableCell>
                        {getTrendIcon(resident.trend)}
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
