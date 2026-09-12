import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { SchoolMedalSummary, Result, Sport, Event } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardChartsProps {
  medalSummaries: SchoolMedalSummary[];
  results: Result[];
  sports: Sport[];
  events: Event[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  medalSummaries,
  results,
  sports,
  events
}) => {
  // 1. School Medals Bar Chart (Stacked or Grouped)
  const schoolLabels = medalSummaries.map((s) => s.short_name || s.school_name);
  const goldData = medalSummaries.map((s) => s.gold);
  const silverData = medalSummaries.map((s) => s.silver);
  const bronzeData = medalSummaries.map((s) => s.bronze);

  const schoolChartData = {
    labels: schoolLabels,
    datasets: [
      {
        label: '🥇 เหรียญทอง',
        data: goldData,
        backgroundColor: '#eab308',
        borderColor: '#ca8a04',
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: '🥈 เหรียญเงิน',
        data: silverData,
        backgroundColor: '#94a3b8',
        borderColor: '#64748b',
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: '🥉 เหรียญทองแดง',
        data: bronzeData,
        backgroundColor: '#d97706',
        borderColor: '#b45309',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const schoolChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { family: 'Prompt', size: 12 },
          boxWidth: 14
        }
      },
      title: {
        display: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Prompt', size: 11 } }
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, font: { family: 'Prompt', size: 11 } }
      }
    }
  };

  // 2. Medal Ratio Doughnut Chart
  const totalGold = medalSummaries.reduce((sum, s) => sum + s.gold, 0);
  const totalSilver = medalSummaries.reduce((sum, s) => sum + s.silver, 0);
  const totalBronze = medalSummaries.reduce((sum, s) => sum + s.bronze, 0);

  const doughnutData = {
    labels: ['เหรียญทอง 🥇', 'เหรียญเงิน 🥈', 'เหรียญทองแดง 🥉'],
    datasets: [
      {
        data: [totalGold, totalSilver, totalBronze],
        backgroundColor: ['#eab308', '#94a3b8', '#d97706'],
        borderColor: ['#ffffff', '#ffffff', '#ffffff'],
        borderWidth: 2,
        hoverOffset: 6
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { family: 'Prompt', size: 12 },
          boxWidth: 14
        }
      }
    }
  };

  // 3. Medals by Sport Category
  const sportCounts: Record<string, number> = {};
  sports.forEach((sp) => {
    sportCounts[sp.sport_name.split(' ')[0]] = 0;
  });

  results
    .filter((r) => r.status === 'CONFIRMED' && r.medal !== 'NONE')
    .forEach((r) => {
      const ev = events.find((e) => e.id === r.event_id);
      const sp = sports.find((s) => s.id === ev?.sport_id);
      if (sp) {
        const key = sp.sport_name.split(' ')[0];
        sportCounts[key] = (sportCounts[key] || 0) + 1;
      }
    });

  const sportsLabels = Object.keys(sportCounts);
  const sportsData = Object.values(sportCounts);

  const sportsChartData = {
    labels: sportsLabels,
    datasets: [
      {
        label: 'จำนวนเหรียญรางวัล',
        data: sportsData,
        backgroundColor: '#4f46e5',
        borderColor: '#4338ca',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  const sportsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Prompt', size: 11 } }
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, font: { family: 'Prompt', size: 11 } }
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart 1: School Comparison */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base font-['Kanit'] flex items-center gap-2">
              <span>📊</span> เปรียบเทียบเหรียญรางวัลของแต่ละโรงเรียน
            </h3>
            <p className="text-xs text-slate-500">
              สรุปจำนวนเหรียญทอง เหรียญเงิน และเหรียญทองแดง แยกตามโรงเรียน
            </p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 uppercase tracking-wider">
            Real-time Sync
          </span>
        </div>
        <div className="h-[280px] w-full">
          <Bar data={schoolChartData} options={schoolChartOptions} />
        </div>
      </div>

      {/* Chart 2: Medal Ratio */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col justify-between">
        <div className="mb-4">
          <h3 className="font-bold text-slate-900 text-base font-['Kanit'] flex items-center gap-2">
            <span>🍩</span> สัดส่วนเหรียญรางวัลรวม
          </h3>
          <p className="text-xs text-slate-500">
            รวมทั้งหมด {totalGold + totalSilver + totalBronze} เหรียญ
          </p>
        </div>
        <div className="h-[220px] w-full flex items-center justify-center">
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center text-xs">
          <div className="bg-amber-50 rounded-xl p-2 border border-amber-100">
            <span className="text-amber-800 font-bold block text-sm font-['Kanit']">{totalGold}</span>
            <span className="text-slate-600 text-[11px]">ทอง</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-2 border border-slate-200">
            <span className="text-slate-700 font-bold block text-sm font-['Kanit']">{totalSilver}</span>
            <span className="text-slate-600 text-[11px]">เงิน</span>
          </div>
          <div className="bg-amber-100/40 rounded-xl p-2 border border-amber-200/50">
            <span className="text-amber-900 font-bold block text-sm font-['Kanit']">{totalBronze}</span>
            <span className="text-slate-600 text-[11px]">ทองแดง</span>
          </div>
        </div>
      </div>

      {/* Chart 3: Medals by Sport */}
      <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base font-['Kanit'] flex items-center gap-2">
              <span>🏅</span> จำนวนเหรียญรางวัลแยกตามชนิดกีฬา
            </h3>
            <p className="text-xs text-slate-500">
              สถิติการมอบรางวัลที่แข่งขันเสร็จสิ้นแล้วตามประเภทกีฬา
            </p>
          </div>
        </div>
        <div className="h-[200px] w-full">
          <Bar data={sportsChartData} options={sportsChartOptions} />
        </div>
      </div>
    </div>
  );
};
