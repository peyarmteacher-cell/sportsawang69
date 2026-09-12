<?php
/**
 * ==============================================================================
 * ไฟล์: includes/header.php
 * คำอธิบาย: ส่วนหัว Navbar และ Assets พื้นฐาน (Tailwind + Google Fonts + Responsive Design)
 * ==============================================================================
 */
require_once __DIR__ . '/auth.php';
$user = getCurrentUser();
$currentPage = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $pageTitle ?? 'ระบบบริหารจัดการแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง' ?> - สพป.บร.3</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800&family=Prompt:wght@300;400;500;600;700&family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Prompt', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        h1, h2, h3, h4, h5, h6, .font-kanit { font-family: 'Kanit', sans-serif; }
        .font-sarabun { font-family: 'Sarabun', sans-serif; }
        @media print {
            .no-print { display: none !important; }
        }
    </style>
</head>
<body class="bg-slate-100 min-h-screen text-slate-900 flex flex-col justify-between antialiased">
    <!-- Top Header Navbar (Google AI Studio Theme) -->
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs no-print">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16 md:h-18">
                <!-- Brand Logo & Title -->
                <a href="<?= app_url('index.php') ?>" class="flex items-center gap-3 select-none group">
                    <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0 font-['Kanit']">
                        SP
                    </div>
                    <div class="max-w-md truncate">
                        <div class="flex items-center gap-2">
                            <span class="font-extrabold text-sm md:text-base font-['Kanit'] text-indigo-950 tracking-wide truncate">
                                การแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง
                            </span>
                            <span class="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 shrink-0">
                                สพป.บร.3
                            </span>
                        </div>
                        <p class="text-[10px] text-slate-500 font-medium hidden sm:block truncate">
                            กลุ่มโรงเรียนสว่างสูงกระสัง • สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3 (สพป.บร.3)
                        </p>
                    </div>
                </a>

                <!-- Desktop Navigation Links -->
                <nav class="hidden lg:flex items-center gap-1.5 text-xs font-bold">
                    <a href="<?= app_url('index.php') ?>" class="px-3.5 py-1.5 rounded-full transition-all <?= $currentPage === 'index.php' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50' ?>">
                        หน้าหลัก & สรุปเหรียญ
                    </a>
                    <a href="<?= app_url('index.php#results') ?>" class="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all">
                        ผลการแข่งขัน
                    </a>
                    <a href="<?= app_url('index.php#schools') ?>" class="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all">
                        ทำเนียบโรงเรียน
                    </a>
                    <a href="<?= app_url('index.php#sports') ?>" class="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all">
                        ชนิดกีฬา
                    </a>

                    <!-- Role-Specific Tabs -->
                    <?php if ($user): ?>
                        <?php if (in_array($user['role'], ['SUPER_ADMIN', 'ADMIN'])): ?>
                            <a href="<?= app_url('admin/index.php') ?>" class="px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 <?= strpos($_SERVER['PHP_SELF'], '/admin/') !== false ? 'bg-indigo-900 text-white shadow-xs' : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100' ?>">
                                <span>⚙️</span> ผู้ดูแลระบบ
                            </a>
                        <?php elseif ($user['role'] === 'SCHOOL'): ?>
                            <a href="<?= app_url('school/index.php') ?>" class="px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 <?= strpos($_SERVER['PHP_SELF'], '/school/') !== false ? 'bg-emerald-700 text-white shadow-xs' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' ?>">
                                <span>🏫</span> ระบบโรงเรียน
                            </a>
                        <?php elseif ($user['role'] === 'REFEREE'): ?>
                            <a href="<?= app_url('judge/index.php') ?>" class="px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 <?= strpos($_SERVER['PHP_SELF'], '/judge/') !== false ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 bg-amber-50 hover:bg-amber-100' ?>">
                                <span>⚡</span> รายงานผลการแข่งขัน
                            </a>
                        <?php endif; ?>
                    <?php endif; ?>
                </nav>

                <!-- Auth / User Section -->
                <div class="flex items-center gap-3">
                    <?php if ($user): ?>
                        <div class="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-2xl border border-slate-200 shadow-2xs">
                            <div class="px-2 py-0.5 text-left hidden sm:block">
                                <p class="text-xs font-bold text-slate-800 font-kanit leading-tight">
                                    <?= htmlspecialchars($user['full_name']) ?>
                                </p>
                                <span class="text-[9px] text-indigo-700 font-bold tracking-wider">
                                    <?= $user['role'] === 'SUPER_ADMIN' ? '👑 ผู้ดูแลระบบสูงสุด' : ($user['role'] === 'ADMIN' ? 'ผู้ดูแลระบบกลาง' : ($user['role'] === 'SCHOOL' ? 'ผู้ดูแลระบบโรงเรียน' : 'กรรมการตัดสิน / ผู้รายงานผล')) ?>
                                </span>
                            </div>
                            <a href="<?= app_url('logout.php') ?>" class="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer" title="ออกจากระบบ">
                                <span>🚪</span>
                                <span class="whitespace-nowrap font-kanit">ออกจากระบบ</span>
                            </a>
                        </div>
                    <?php else: ?>
                        <a href="<?= app_url('login.php') ?>" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition-all shadow-xs hover:shadow-md flex items-center gap-1.5 font-kanit cursor-pointer">
                            <span>🔑</span> เข้าสู่ระบบ
                        </a>
                    <?php endif; ?>

                    <!-- Mobile Hamburger Button -->
                    <button onclick="document.getElementById('mobileNav').classList.toggle('hidden')" class="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- Mobile Dropdown Menu -->
        <div id="mobileNav" class="hidden lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 text-xs font-bold">
            <a href="<?= app_url('index.php') ?>" class="block py-2 px-3 rounded-lg text-slate-700 hover:bg-indigo-50 hover:text-indigo-600">หน้าหลัก & สรุปเหรียญ</a>
            <a href="<?= app_url('index.php#results') ?>" class="block py-2 px-3 rounded-lg text-slate-700 hover:bg-indigo-50 hover:text-indigo-600">ผลการแข่งขัน</a>
            <a href="<?= app_url('index.php#schools') ?>" class="block py-2 px-3 rounded-lg text-slate-700 hover:bg-indigo-50 hover:text-indigo-600">ทำเนียบโรงเรียน</a>
            <a href="<?= app_url('index.php#sports') ?>" class="block py-2 px-3 rounded-lg text-slate-700 hover:bg-indigo-50 hover:text-indigo-600">ชนิดกีฬา</a>
            <?php if ($user): ?>
                <?php if (in_array($user['role'], ['SUPER_ADMIN', 'ADMIN'])): ?>
                    <a href="<?= app_url('admin/index.php') ?>" class="block py-2 px-3 rounded-lg bg-indigo-50 text-indigo-700">⚙️ เมนูผู้ดูแลระบบ</a>
                <?php elseif ($user['role'] === 'SCHOOL'): ?>
                    <a href="<?= app_url('school/index.php') ?>" class="block py-2 px-3 rounded-lg bg-emerald-50 text-emerald-700">🏫 ระบบโรงเรียน</a>
                <?php elseif ($user['role'] === 'REFEREE'): ?>
                    <a href="<?= app_url('judge/index.php') ?>" class="block py-2 px-3 rounded-lg bg-amber-50 text-amber-700">⚡ รายงานผลการแข่งขันประจำวัน</a>
                <?php endif; ?>
                <a href="<?= app_url('logout.php') ?>" class="block py-2 px-3 bg-rose-600 text-white rounded-xl text-center font-bold">ออกจากระบบ</a>
            <?php else: ?>
                <a href="<?= app_url('login.php') ?>" class="block py-2 px-3 rounded-xl bg-indigo-600 text-white text-center font-bold">เข้าสู่ระบบ</a>
            <?php endif; ?>
        </div>
    </header>

    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
