import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ReviewsByStatusChartProps {
  openCount: number;
  completedCount: number;
  inReviewCount: number;
}

const COLORS = ['hsl(210, 100%, 20%)', 'hsl(40, 70%, 55%)', 'hsl(142, 76%, 36%)'];

export function ReviewsByStatusChart({ openCount, completedCount, inReviewCount }: ReviewsByStatusChartProps) {
  const data = [
    { name: 'Draft', value: openCount, color: COLORS[0] },
    { name: 'In Review', value: inReviewCount, color: COLORS[1] },
    { name: 'Completed', value: completedCount, color: COLORS[2] },
  ].filter(d => d.value > 0);

  const total = openCount + completedCount + inReviewCount;

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reviews by Status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reviews by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [value, 'Reviews']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
