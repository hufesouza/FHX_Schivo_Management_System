import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface UserReviewData {
  name: string;
  open: number;
  completed: number;
}

interface ReviewsByUserChartProps {
  data: UserReviewData[];
}

export function ReviewsByUserChart({ data }: ReviewsByUserChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reviews by Assignee</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    );
  }

  // Sort by total reviews and take top 8
  const sortedData = [...data]
    .sort((a, b) => (b.open + b.completed) - (a.open + a.completed))
    .slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reviews by Assignee</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sortedData} margin={{ left: -10, right: 10 }}>
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar 
              dataKey="open" 
              name="Open" 
              fill="hsl(210, 100%, 20%)" 
              stackId="a"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="completed" 
              name="Completed" 
              fill="hsl(142, 76%, 36%)" 
              stackId="a"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
