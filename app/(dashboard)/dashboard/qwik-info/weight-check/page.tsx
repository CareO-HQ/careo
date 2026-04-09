"use client";

import { useState, useEffect, useMemo } from 'react';
import { useProfile } from '@/hooks/use-profile';
import { Input } from '@/components/ui/input';
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
import { Search, Scale, TrendingUp, TrendingDown, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type WeightCheckData = {
  residentId: string;
  name: string;
  roomNumber: string;
  frequency: 'weekly' | 'monthly' | 'as-needed';
  lastWeight: number | null;
  previousWeight: number | null;
  change: number | null;
  lastCheckedDate: string | null;
  nextDueDate: string | null;
  status: 'on-track' | 'due-soon' | 'overdue' | 'no-data';
};

type SortKey = 'name' | 'lastCheckedDate' | 'nextDueDate' | 'change';

export default function WeightCheckPage() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const [weightData, setWeightData] = useState<WeightCheckData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('nextDueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const activeTeamId = profile?.active_team_id;

  useEffect(() => {
    const fetchWeightCheckData = async () => {
      if (!activeTeamId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/qwik-info/weight-checks?teamId=${activeTeamId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch weight check data');
        }

        const result = await response.json();
        setWeightData(result.data || []);
      } catch (error) {
        console.error('Error fetching weight check data:', error);
        setWeightData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeightCheckData();
  }, [activeTeamId]);

  // Filter by search query
  const filteredData = useMemo(() => {
    return weightData.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [weightData, searchQuery]);

  // Group by frequency
  const weeklyData = useMemo(() => {
    return filteredData.filter(item => item.frequency === 'weekly');
  }, [filteredData]);

  const monthlyData = useMemo(() => {
    return filteredData.filter(item => item.frequency === 'monthly');
  }, [filteredData]);

  const asNeededData = useMemo(() => {
    return filteredData.filter(item => item.frequency === 'as-needed');
  }, [filteredData]);

  // Sort function
  const sortData = (data: WeightCheckData[]) => {
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortKey) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'lastCheckedDate':
          aValue = a.lastCheckedDate ? new Date(a.lastCheckedDate).getTime() : 0;
          bValue = b.lastCheckedDate ? new Date(b.lastCheckedDate).getTime() : 0;
          break;
        case 'nextDueDate':
          aValue = a.nextDueDate ? new Date(a.nextDueDate).getTime() : Number.MAX_SAFE_INTEGER;
          bValue = b.nextDueDate ? new Date(b.nextDueDate).getTime() : Number.MAX_SAFE_INTEGER;
          break;
        case 'change':
          aValue = a.change || 0;
          bValue = b.change || 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge className="bg-red-500 text-white">Overdue</Badge>;
      case 'due-soon':
        return <Badge className="bg-orange-500 text-white">Due Soon</Badge>;
      case 'on-track':
        return <Badge className="bg-green-500 text-white">On Track</Badge>;
      case 'no-data':
        return <Badge variant="outline" className="text-gray-500">No Data</Badge>;
      default:
        return null;
    }
  };

  const getStatusRowClass = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-50 hover:bg-red-100';
      case 'due-soon':
        return 'bg-orange-50 hover:bg-orange-100';
      case 'on-track':
        return 'bg-green-50 hover:bg-green-100';
      default:
        return 'hover:bg-gray-50';
    }
  };

  const renderWeightTable = (data: WeightCheckData[], title: string, description: string) => {
    const sortedData = sortData(data);

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No residents found in this category</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('name')}
                    >
                      Resident Name {sortKey === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Last Weight (kg)</TableHead>
                    <TableHead>Previous Weight (kg)</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('change')}
                    >
                      Change {sortKey === 'change' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('lastCheckedDate')}
                    >
                      Last Checked {sortKey === 'lastCheckedDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('nextDueDate')}
                    >
                      Next Due {sortKey === 'nextDueDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((item) => (
                    <TableRow
                      key={item.residentId}
                      className={cn(getStatusRowClass(item.status))}
                    >
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.roomNumber}</TableCell>
                      <TableCell>
                        {item.lastWeight !== null ? item.lastWeight.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.previousWeight !== null ? item.previousWeight.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.change !== null ? (
                          <span className={cn(
                            'flex items-center gap-1 font-medium',
                            item.change > 0 ? 'text-green-600' : item.change < 0 ? 'text-red-600' : 'text-gray-600'
                          )}>
                            {item.change > 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : item.change < 0 ? (
                              <TrendingDown className="w-4 h-4" />
                            ) : null}
                            {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {item.lastCheckedDate ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(item.lastCheckedDate), 'dd MMM yyyy')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {item.nextDueDate ? (
                          format(new Date(item.nextDueDate), 'dd MMM yyyy')
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeTeamId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Please select a unit/team to view weight checks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Weight Check Dashboard</h1>
        <p className="text-gray-600">
          Monitor resident weight checks across your unit. Track progress and identify overdue assessments.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by resident name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
          <p className="text-[10px] text-blue-700 font-medium uppercase tracking-wide mb-0.5">Weekly Checks</p>
          <p className="text-base font-semibold text-blue-900 mb-0.5">{weeklyData.length}</p>
          <p className="text-[10px] text-red-600 font-medium">
            {weeklyData.filter(d => d.status === 'overdue').length} overdue
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-2.5">
          <p className="text-[10px] text-purple-700 font-medium uppercase tracking-wide mb-0.5">Monthly Checks</p>
          <p className="text-base font-semibold text-purple-900 mb-0.5">{monthlyData.length}</p>
          <p className="text-[10px] text-red-600 font-medium">
            {monthlyData.filter(d => d.status === 'overdue').length} overdue
          </p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-2.5">
          <p className="text-[10px] text-green-700 font-medium uppercase tracking-wide mb-0.5">As Needed</p>
          <p className="text-base font-semibold text-green-900 mb-0.5">{asNeededData.length}</p>
          <p className="text-[10px] text-green-700">
            Monitored as required
          </p>
        </div>
      </div>

      {/* Tables */}
      {renderWeightTable(
        weeklyData,
        'Weekly Weight Checks',
        'Residents requiring weekly weight monitoring'
      )}

      {renderWeightTable(
        monthlyData,
        'Monthly Weight Checks',
        'Residents requiring monthly weight monitoring'
      )}

      {renderWeightTable(
        asNeededData,
        'As Needed Weight Checks',
        'Residents monitored as clinically required'
      )}
    </div>
  );
}
