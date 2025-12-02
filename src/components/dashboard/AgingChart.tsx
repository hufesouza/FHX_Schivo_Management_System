import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AgingData {
  name: string;
  days: number;
  workOrderNumber: string;
}

interface AgingChartProps {
  data: AgingData[];
}

export function AgingChart({ data }: AgingChartProps) {
  const getBarColor = (days: number) => {
    if (days <= 3) return 'hsl(142, 76%, 36%)'; // Green
    if (days <= 7) return 'hsl(40, 70%, 55%)';  // Gold
    if (days <= 14) return 'hsl(25, 95%, 53%)'; // Orange
    return 'hsl(0, 72%, 51%)';                   // Red
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open Reviews Aging</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          No open reviews
        </CardContent>
      </Card>
    );
  }

  // Sort by days descending and take top 10
  const sortedData = [...data].sort((a, b) => b.days - a.days).slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Open Reviews Aging (Days Open)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sortedData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" />
            <YAxis 
              dataKey="workOrderNumber" 
              type="category" 
              width={80}
              tick={{ fontSize: 11 }}
            />
            <Tooltip 
              formatter={(value: number) => [`${value} days`, 'Age']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="days" radius={[0, 4, 4, 0]}>
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.days)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /> 0-3 days
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(40, 70%, 55%)' }} /> 4-7 days
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(25, 95%, 53%)' }} /> 8-14 days
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(0, 72%, 51%)' }} /> 14+ days
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
