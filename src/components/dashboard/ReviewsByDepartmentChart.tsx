import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DepartmentData {
  department: string;
  count: number;
}

interface ReviewsByDepartmentChartProps {
  data: DepartmentData[];
}

const DEPARTMENT_COLORS: Record<string, string> = {
  'header': 'hsl(210, 15%, 60%)',
  'engineering': 'hsl(210, 100%, 20%)',
  'operations': 'hsl(40, 70%, 55%)',
  'quality': 'hsl(142, 76%, 36%)',
  'npi': 'hsl(280, 60%, 50%)',
  'supply_chain': 'hsl(25, 95%, 53%)',
};

const DEPARTMENT_LABELS: Record<string, string> = {
  'header': 'Header',
  'engineering': 'Engineering',
  'operations': 'Operations',
  'quality': 'Quality',
  'npi': 'NPI',
  'supply_chain': 'Supply Chain',
};

export function ReviewsByDepartmentChart({ data }: ReviewsByDepartmentChartProps) {
  if (data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open Reviews by Department</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          No open reviews
        </CardContent>
      </Card>
    );
  }

  const chartData = data
    .filter(d => d.count > 0)
    .map(d => ({
      ...d,
      label: DEPARTMENT_LABELS[d.department] || d.department,
      color: DEPARTMENT_COLORS[d.department] || 'hsl(210, 15%, 50%)',
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Open Reviews by Department</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip 
              formatter={(value: number) => [value, 'Reviews']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
