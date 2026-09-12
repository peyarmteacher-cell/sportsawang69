<?php
/**
 * ==============================================================================
 * ไฟล์: index.php
 * คำอธิบาย: หน้าหลัก Public Portal (Google AI Studio Theme Match)
 * แสดงสรุปเหรียญรางวัล, รายงานผลประจำวัน (Live Feed), ผลการแข่งขัน และทำเนียบ 12 โรงเรียน
 * ==============================================================================
 */
require_once __DIR__ . '/config/database.php';
$pageTitle = 'หน้าหลัก & ตารางสรุปเหรียญรางวัล - กีฬากลุ่มโรงเรียนสว่างสูงกระสัง สพป.บร.3';

try {
    $pdo = Database::getConnection();

    // 1. ดึงข้อมูลการแข่งขันหลัก
    $comp = $pdo->query("SELECT * FROM competitions WHERE status != 'ARCHIVED' LIMIT 1")->fetch() ?: [
        'competition_name' => 'การแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง ประจำปีการศึกษา 2569',
        'host_org' => 'กลุ่มโรงเรียนสว่างสูงกระสัง • สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3 (สพป.บร.3)',
        'venue' => 'สนามกีฬาโรงเรียนบ้านหนองหว้า อ.กระสัง จ.บุรีรัมย์',
        'start_date' => '2026-11-15',
        'end_date' => '2026-11-20'
    ];

    // 2. ดึงตารางสรุปเหรียญรางวัล 12 โรงเรียน
    $medalSql = "
        SELECT 
            s.id,
            s.school_name,
            s.short_name,
            s.logo,
            s.smis_code,
            s.director_name,
            s.phone,
            COALESCE(SUM(CASE WHEN r.medal = 'GOLD' THEN 1 ELSE 0 END), 0) AS gold_count,
            COALESCE(SUM(CASE WHEN r.medal = 'SILVER' THEN 1 ELSE 0 END), 0) AS silver_count,
            COALESCE(SUM(CASE WHEN r.medal = 'BRONZE' THEN 1 ELSE 0 END), 0) AS bronze_count,
            (COALESCE(SUM(CASE WHEN r.medal = 'GOLD' THEN 1 ELSE 0 END), 0) * 5 +
             COALESCE(SUM(CASE WHEN r.medal = 'SILVER' THEN 1 ELSE 0 END), 0) * 3 +
             COALESCE(SUM(CASE WHEN r.medal = 'BRONZE' THEN 1 ELSE 0 END), 0) * 1) AS total_points,
            COUNT(r.id) AS total_medals
        FROM schools s
        LEFT JOIN results r ON s.id = r.school_id AND r.status = 'OFFICIAL'
        GROUP BY s.id
        ORDER BY gold_count DESC, silver_count DESC, bronze_count DESC, total_points DESC, s.school_name ASC
    ";
    $standings = $pdo->query($medalSql)->fetchAll();

    // 3. สถิติรวมสำหรับ 6 Key Stat Cards
    $totalGold = array_sum(array_column($standings, 'gold_count'));
    $totalSilver = array_sum(array_column($standings, 'silver_count'));
    $totalBronze = array_sum(array_column($standings, 'bronze_count'));
    $totalMedals = $totalGold + $totalSilver + $totalBronze;

    $totalSchools = count($standings);
    $totalEvents = $pdo->query("SELECT COUNT(*) FROM events")->fetchColumn() ?: 24;
    $totalSports = $pdo->query("SELECT COUNT(*) FROM sports WHERE status = 'ACTIVE'")->fetchColumn() ?: 7;
    $totalStudents = $pdo->query("SELECT COUNT(*) FROM students")->fetchColumn() ?: 120;
    $totalCoaches = $pdo->query("SELECT COUNT(*) FROM coaches")->fetchColumn() ?: 36;

    // 4. ดึงรายการกีฬา
    $sports = $pdo->query("SELECT * FROM sports WHERE status = 'ACTIVE' ORDER BY sport_name ASC")->fetchAll();

    // 5. ดึงรายงานผลการแข่งขันรายวัน (Daily Match Reports)
    $dailyMatchReports = [];
    try {
        $dailyMatchReports = $pdo->query("SELECT * FROM match_reports ORDER BY created_at DESC LIMIT 8")->fetchAll();
    } catch (Exception $mre) {
        // Table might not exist yet
    }

    // 6. ดึงผลการแข่งขันอย่างเป็นทางการล่าสุด (Official Results)
    $recentResults = $pdo->query("
        SELECT e.id as event_id, e.event_name, e.event_code, sp.sport_name, sp.sport_icon,
               MAX(CASE WHEN r.medal = 'GOLD' THEN sch.school_name END) as gold_school,
               MAX(CASE WHEN r.medal = 'SILVER' THEN sch.school_name END) as silver_school,
               MAX(CASE WHEN r.medal = 'BRONZE' THEN sch.school_name END) as bronze_school,
               MAX(r.score) as score,
               MAX(r.recorded_at) as recorded_at
        FROM events e
        JOIN sports sp ON e.sport_id = sp.id
        JOIN results r ON e.id = r.event_id AND r.status = 'OFFICIAL'
        JOIN schools sch ON r.school_id = sch.id
        GROUP BY e.id, e.event_name, e.event_code, sp.sport_name, sp.sport_icon
        ORDER BY recorded_at DESC
        LIMIT 6
    ")->fetchAll();

} catch (Exception $e) {
    require_once __DIR__ . '/includes/auth.php';
    redirect_to('install.php');
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="space-y-8 pb-12">
    <!-- Hero Section (Exact Google AI Studio Gradient Theme) -->
    <div class="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl p-6 md:p-8 border border-indigo-800/40">
        <div class="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute bottom-0 left-1/4 -mb-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 max-w-4xl space-y-3">
            <div class="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-amber-950 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xs">
                <span>🔥</span> LIVE SPORT EVENT 2026 &bull; ประจำปี ๒๕๖๙
            </div>

            <h1 class="text-2xl md:text-4xl font-black font-kanit tracking-tight text-white leading-tight">
                <?= htmlspecialchars($comp['competition_name']) ?>
            </h1>

            <p class="text-slate-200 text-xs md:text-sm font-['Prompt']">
                <?= htmlspecialchars($comp['host_org'] ?? 'กลุ่มโรงเรียนสว่างสูงกระสัง • สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3 (สพป.บร.3)') ?>
            </p>

            <div class="flex flex-wrap items-center gap-4 md:gap-6 mt-4 pt-4 border-t border-slate-700/80 text-xs md:text-sm text-slate-300">
                <div class="flex items-center gap-1.5">
                    <span>🗓️</span>
                    <span class="font-medium">
                        <?= formatThaiDateRange($comp['start_date'] ?? '2026-11-15', $comp['end_date'] ?? '2026-11-20') ?>
                    </span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span>📍</span>
                    <span><?= htmlspecialchars($comp['venue'] ?? 'สนามกีฬาโรงเรียนบ้านหนองหว้า อ.กระสัง จ.บุรีรัมย์') ?></span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span class="text-emerald-300 font-bold uppercase tracking-wider text-xs">
                        กำลังดำเนินการแข่งขัน (LIVE)
                    </span>
                </div>
            </div>
        </div>
    </div>

    <!-- 6 Key Stat Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <!-- Card 1: Schools -->
        <div class="bg-white rounded-xl md:rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between hover:border-indigo-300 transition-all">
            <div class="flex items-center justify-between text-slate-500">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">โรงเรียนเข้าร่วม</span>
                <span class="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs">🏫</span>
            </div>
            <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl md:text-3xl font-black font-kanit text-slate-800"><?= $totalSchools ?></span>
                <span class="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">สถานศึกษา</span>
            </div>
        </div>

        <!-- Card 2: Events -->
        <div class="bg-white rounded-xl md:rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between hover:border-indigo-300 transition-all">
            <div class="flex items-center justify-between text-slate-500">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">รายการแข่งขัน</span>
                <span class="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs">🎯</span>
            </div>
            <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl md:text-3xl font-black font-kanit text-slate-800"><?= $totalEvents ?></span>
                <span class="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">อีเวนต์</span>
            </div>
        </div>

        <!-- Card 3: Sports -->
        <div class="bg-white rounded-xl md:rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between hover:border-indigo-300 transition-all">
            <div class="flex items-center justify-between text-slate-500">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">ชนิดกีฬา</span>
                <span class="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs">⚽</span>
            </div>
            <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl md:text-3xl font-black font-kanit text-slate-800"><?= $totalSports ?></span>
                <span class="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">ประเภท</span>
            </div>
        </div>

        <!-- Card 4: Students -->
        <div class="bg-white rounded-xl md:rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between hover:border-indigo-300 transition-all">
            <div class="flex items-center justify-between text-slate-500">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">นักกีฬาลงทะเบียน</span>
                <span class="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs">🏃</span>
            </div>
            <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl md:text-3xl font-black font-kanit text-slate-800"><?= $totalStudents ?></span>
                <span class="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">คน</span>
            </div>
        </div>

        <!-- Card 5: Coaches -->
        <div class="bg-white rounded-xl md:rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between hover:border-indigo-300 transition-all">
            <div class="flex items-center justify-between text-slate-500">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">ผู้ฝึกสอน</span>
                <span class="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs">👔</span>
            </div>
            <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl md:text-3xl font-black font-kanit text-slate-800"><?= $totalCoaches ?></span>
                <span class="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">ท่าน</span>
            </div>
        </div>

        <!-- Card 6: Total Medals -->
        <div class="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl md:rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div class="flex items-center justify-between text-amber-100">
                <span class="text-[10px] font-bold uppercase tracking-wider text-amber-100">เหรียญรางวัลรวม</span>
                <span class="p-1.5 bg-white/20 text-white rounded-lg text-xs">🏆</span>
            </div>
            <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl md:text-3xl font-black font-kanit text-white"><?= $totalMedals ?></span>
                <span class="text-[10px] text-amber-950 font-bold bg-amber-200 px-2 py-0.5 rounded">เหรียญ</span>
            </div>
        </div>
    </div>

    <!-- Live Match Reports Feed (Real-Time from Judges) -->
    <?php if (!empty($dailyMatchReports)): ?>
        <div class="bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-purple-800/40 space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div class="flex items-center gap-3">
                    <div class="p-2.5 bg-purple-500/20 text-purple-300 rounded-2xl border border-purple-400/30 text-xl">
                        ⚡
                    </div>
                    <div>
                        <h2 class="text-lg font-bold font-kanit text-white">รายงานผลการแข่งขันประจำวัน (Live Match Scores)</h2>
                        <p class="text-xs text-purple-200">ผลการแข่งขันแบบรายคู่ เรียลไทม์จากกรรมการผู้ตัดสินประจำสนาม</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 self-start sm:self-auto">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-semibold">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> สดจากสนาม
                    </span>
                    <a href="<?= app_url('judge/index.php') ?>" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-bold transition shadow-xs">
                        + รายงานผล
                    </a>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <?php foreach ($dailyMatchReports as $mr): ?>
                    <div class="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/10 transition-all space-y-2.5">
                        <div class="flex items-center justify-between text-[11px] text-purple-200">
                            <span class="font-bold px-2.5 py-0.5 bg-purple-500/30 text-amber-300 rounded-md border border-purple-400/20">
                                <?= htmlspecialchars($mr['sport_name']) ?>
                            </span>
                            <span class="text-slate-300"><?= htmlspecialchars($mr['round_name'] ?? 'รอบแรก') ?> &bull; <?= htmlspecialchars($mr['match_time'] ?: $mr['match_date']) ?></span>
                        </div>

                        <div class="flex items-center justify-between gap-3 text-sm py-1">
                            <div class="flex-1 font-bold text-white text-right truncate">
                                <?= htmlspecialchars($mr['team_1_school_name']) ?>
                            </div>
                            <div class="px-3.5 py-1 bg-black/40 rounded-xl font-black text-amber-400 font-mono text-base tracking-wider shrink-0 border border-white/10 shadow-inner">
                                <?= (int)$mr['team_1_score'] ?> - <?= (int)$mr['team_2_score'] ?>
                            </div>
                            <div class="flex-1 font-bold text-white text-left truncate">
                                <?= htmlspecialchars($mr['team_2_school_name']) ?>
                            </div>
                        </div>

                        <div class="flex items-center justify-between text-[11px] text-slate-300 pt-2 border-t border-white/10">
                            <span class="text-amber-200 font-semibold truncate max-w-[70%]">
                                📣 <?= htmlspecialchars($mr['summary_text']) ?>
                            </span>
                            <span class="text-[10px] text-slate-400 shrink-0">โดย: <?= htmlspecialchars($mr['reporter_name']) ?></span>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    <?php endif; ?>

    <!-- Navigation Anchor Tabs -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
        <a href="#medals" class="px-4 py-2 bg-indigo-600 text-white rounded-full shadow-xs whitespace-nowrap">
            🏆 ตารางสรุปเหรียญรางวัล
        </a>
        <a href="#results" class="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-full border border-slate-200 whitespace-nowrap transition">
            ⚡ ผลการแข่งขันทางการ
        </a>
        <a href="#schools" class="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-full border border-slate-200 whitespace-nowrap transition">
            🏫 ทำเนียบ 12 โรงเรียน
        </a>
        <a href="#sports" class="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-full border border-slate-200 whitespace-nowrap transition">
            🏅 ชนิดกีฬา
        </a>
    </div>

    <!-- Medal Standings Table (Main Feature) -->
    <div id="medals" class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
                <h2 class="text-lg font-bold font-kanit text-slate-900 flex items-center gap-2">
                    <span>🏆</span> ตารางสรุปเหรียญรางวัลรวม (Official Medal Tally)
                </h2>
                <p class="text-xs text-slate-500 mt-0.5">
                    เรียงตามจำนวนเหรียญทอง &gt; เหรียญเงิน &gt; เหรียญทองแดง &gt; คะแนนรวม (คลิก "ดูรายละเอียด" เพื่อดูผลงานและรายชื่อนักกีฬา)
                </p>
            </div>
            <span class="text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-semibold self-start sm:self-auto flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> สรุปคะแนนสด
            </span>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <tr>
                        <th class="py-4 px-4 text-center w-16">อันดับ</th>
                        <th class="py-4 px-4">โรงเรียน / สถานศึกษา</th>
                        <th class="py-4 px-4 text-center text-amber-600 font-bold">🥇 ทอง</th>
                        <th class="py-4 px-4 text-center text-slate-600 font-bold">🥈 เงิน</th>
                        <th class="py-4 px-4 text-center text-orange-600 font-bold">🥉 ทองแดง</th>
                        <th class="py-4 px-4 text-center font-bold">รวมเหรียญ</th>
                        <th class="py-4 px-4 text-center text-indigo-600 font-bold">คะแนนรวม</th>
                        <th class="py-4 px-4 text-center">ดูผลงานสถานศึกษา</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php foreach ($standings as $index => $sch): ?>
                        <tr class="hover:bg-slate-50/80 transition <?= $index === 0 ? 'bg-amber-50/20 font-semibold' : '' ?>">
                            <td class="py-4 px-4 text-center font-bold">
                                <?php if ($index === 0): ?>
                                    <span class="w-8 h-8 bg-amber-400 text-amber-950 rounded-full inline-flex items-center justify-center font-black shadow-xs text-sm">1</span>
                                <?php elseif ($index === 1): ?>
                                    <span class="w-8 h-8 bg-slate-300 text-slate-900 rounded-full inline-flex items-center justify-center font-black shadow-xs text-sm">2</span>
                                <?php elseif ($index === 2): ?>
                                    <span class="w-8 h-8 bg-amber-700 text-white rounded-full inline-flex items-center justify-center font-black shadow-xs text-sm">3</span>
                                <?php else: ?>
                                    <span class="text-slate-500 font-semibold text-sm"><?= $index + 1 ?></span>
                                <?php endif; ?>
                            </td>
                            <td class="py-4 px-4">
                                <div class="flex items-center gap-3">
                                    <img src="<?= htmlspecialchars($sch['logo'] ?: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150') ?>" alt="" class="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs">
                                    <div>
                                        <a href="<?= app_url('school_detail.php?id=' . urlencode($sch['id'])) ?>" class="font-bold text-slate-900 text-sm hover:text-indigo-600 transition font-kanit">
                                            <?= htmlspecialchars($sch['school_name']) ?>
                                        </a>
                                        <div class="text-[11px] font-mono text-slate-400">SMIS: <?= htmlspecialchars($sch['smis_code']) ?> &bull; <?= htmlspecialchars($sch['director_name'] ?? 'ผู้บริหารสถานศึกษา') ?></div>
                                    </div>
                                </div>
                            </td>
                            <td class="py-4 px-4 text-center font-black text-amber-600 text-base bg-amber-50/40"><?= $sch['gold_count'] ?></td>
                            <td class="py-4 px-4 text-center font-bold text-slate-600 text-base bg-slate-50/60"><?= $sch['silver_count'] ?></td>
                            <td class="py-4 px-4 text-center font-bold text-orange-700 text-base bg-orange-50/40"><?= $sch['bronze_count'] ?></td>
                            <td class="py-4 px-4 text-center font-black text-slate-900 text-base"><?= $sch['total_medals'] ?></td>
                            <td class="py-4 px-4 text-center font-black text-indigo-700 text-base bg-indigo-50/50"><?= $sch['total_points'] ?></td>
                            <td class="py-4 px-4 text-center">
                                <a 
                                    href="<?= app_url('school_detail.php?id=' . urlencode($sch['id'])) ?>" 
                                    class="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 font-bold text-xs rounded-xl border border-indigo-200 transition shadow-2xs"
                                >
                                    <span>🔍</span> ดูรายละเอียด
                                </a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Official Results Section -->
    <div id="results" class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
                <h2 class="text-lg font-bold font-kanit text-slate-900 flex items-center gap-2">
                    <span>⚡</span> ผลการแข่งขันอย่างเป็นทางการล่าสุด (Official Event Results)
                </h2>
                <p class="text-xs text-slate-500">ผลการตัดสินที่ได้รับการรับรองเหรียญรางวัลและออกเกียรติบัตรเรียบร้อยแล้ว</p>
            </div>
            <span class="text-xs text-slate-400 font-medium">6 รายการล่าสุด</span>
        </div>

        <?php if (!empty($recentResults)): ?>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <?php foreach ($recentResults as $res): ?>
                    <div class="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition shadow-2xs space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                                <span><?= $res['sport_icon'] ?: '🏆' ?></span> <?= htmlspecialchars($res['sport_name']) ?>
                            </span>
                            <span class="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200"><?= htmlspecialchars($res['event_code']) ?></span>
                        </div>
                        <h4 class="font-bold font-kanit text-slate-900 text-base leading-snug"><?= htmlspecialchars($res['event_name']) ?></h4>
                        
                        <div class="pt-3 border-t border-slate-200/70 space-y-1.5 text-xs">
                            <div class="flex items-center justify-between">
                                <span class="text-amber-800 font-semibold flex items-center gap-1">🥇 ชนะเลิศ:</span>
                                <span class="font-bold text-slate-900 truncate max-w-[60%]"><?= htmlspecialchars($res['gold_school'] ?: '-') ?></span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-slate-600 font-medium flex items-center gap-1">🥈 รองฯ 1:</span>
                                <span class="text-slate-800 truncate max-w-[60%]"><?= htmlspecialchars($res['silver_school'] ?: '-') ?></span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-orange-800 font-medium flex items-center gap-1">🥉 รองฯ 2:</span>
                                <span class="text-slate-800 truncate max-w-[60%]"><?= htmlspecialchars($res['bronze_school'] ?: '-') ?></span>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <div class="py-8 text-center text-slate-400 text-xs">
                ยังไม่มีการบันทึกสรุปผลการแข่งขันทางการ
            </div>
        <?php endif; ?>
    </div>

    <!-- Schools Directory Grid -->
    <div id="schools" class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
                <h2 class="text-lg font-bold font-kanit text-slate-900 flex items-center gap-2">
                    <span>🏫</span> ทำเนียบ 12 สถานศึกษา กลุ่มโรงเรียนสว่างสูงกระสัง
                </h2>
                <p class="text-xs text-slate-500">สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3 (สพป.บร.3)</p>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <?php foreach ($standings as $s): ?>
                <div class="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between space-y-4">
                    <div class="flex items-start gap-3">
                        <img 
                            src="<?= htmlspecialchars($s['logo'] ?: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150') ?>" 
                            class="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                        >
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold font-kanit text-slate-900 text-sm leading-snug truncate"><?= htmlspecialchars($s['school_name']) ?></h4>
                            <span class="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 mt-1 inline-block">
                                SMIS: <?= htmlspecialchars($s['smis_code']) ?>
                            </span>
                        </div>
                    </div>

                    <div class="text-xs text-slate-500">
                        ผอ.: <?= htmlspecialchars($s['director_name'] ?? 'ผู้บริหารสถานศึกษา') ?>
                    </div>

                    <div class="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                        <div class="flex items-center gap-2 font-bold">
                            <span class="text-amber-600">🥇 <?= $s['gold_count'] ?></span>
                            <span class="text-slate-600">🥈 <?= $s['silver_count'] ?></span>
                            <span class="text-orange-700">🥉 <?= $s['bronze_count'] ?></span>
                        </div>
                        <a 
                            href="<?= app_url('school_detail.php?id=' . urlencode($s['id'])) ?>" 
                            class="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                        >
                            ดูข้อมูล &rarr;
                        </a>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Sports Category List -->
    <div id="sports" class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
        <h2 class="text-lg font-bold font-kanit text-slate-900 flex items-center gap-2">
            <span>🏅</span> ชนิดกีฬาที่เปิดแข่งขันทั้งหมด
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <?php foreach ($sports as $sp): ?>
                <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 transition shadow-2xs space-y-1">
                    <h3 class="font-bold text-slate-900 font-kanit text-sm flex items-center gap-2">
                        <span><?= $sp['sport_icon'] ?: '🏆' ?></span>
                        <span><?= htmlspecialchars($sp['sport_name']) ?></span>
                    </h3>
                    <p class="text-xs text-slate-500"><?= htmlspecialchars($sp['description'] ?? 'กีฬามาตรฐานประจำการแข่งขัน') ?></p>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
