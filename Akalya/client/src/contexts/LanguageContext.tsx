import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'hi' | 'te' | 'pa';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    const translations = translationsMap[language];
    return translations[key] || translationsMap.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Translation maps
const translationsMap: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'common.welcome': 'Welcome',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.update': 'Update',
    'common.submit': 'Submit',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.actions': 'Actions',
    'common.enter': 'Enter',
    
    // Auth
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.signOut': 'Sign Out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.fullName': 'Full Name',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.rememberMe': 'Remember Me',
    'auth.dontHaveAccount': "Don't have an account?",
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.welcomeBack': 'Welcome back!',
    'auth.signedOut': 'Signed out successfully',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.overview': 'Overview',
    'dashboard.stats': 'Statistics',
    'dashboard.recentActivity': 'Recent Activity',
    
    // Courses
    'courses.title': 'Courses',
    'courses.myCourses': 'My Courses',
    'courses.explore': 'Explore Courses',
    'courses.create': 'Create Course',
    'courses.manage': 'Manage Courses',
    'courses.enroll': 'Enroll Now',
    'courses.enrolled': 'Enrolled',
    'courses.published': 'Published',
    'courses.draft': 'Draft',
    'courses.noCourses': 'No courses available',
    'courses.noEnrolled': 'No enrolled courses',
    'courses.startLearning': 'Start learning by enrolling in a course',
    'courses.description': 'Courses you are currently enrolled in',
    'courses.browse': 'Browse and enroll in available courses',
    
    // Assignments
    'assignments.title': 'Assignments',
    'assignments.create': 'Create Assignment',
    'assignments.submit': 'Submit Assignment',
    'assignments.grade': 'Grade',
    'assignments.graded': 'Graded',
    'assignments.pending': 'Pending',
    'assignments.submitted': 'Submitted',
    'assignments.dueDate': 'Due Date',
    'assignments.maxScore': 'Maximum Score',
    'assignments.noAssignments': 'No assignments available',
    'assignments.viewSubmit': 'View and submit your course assignments',
    
    // Classes
    'classes.title': 'Classes',
    'classes.create': 'Create Class',
    'classes.live': 'Live Class',
    'classes.recorded': 'Recorded Class',
    'classes.scheduled': 'Scheduled',
    'classes.ongoing': 'Ongoing',
    'classes.completed': 'Completed',
    'classes.join': 'Join Class',
    'classes.watch': 'Watch Recording',
    
    // Settings
    'settings.title': 'Settings',
    'settings.profile': 'Profile',
    'settings.account': 'Account',
    'settings.preferences': 'Preferences',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.notifications': 'Notifications',
    'settings.security': 'Security',
    'settings.selectLanguage': 'Select Language',
    'settings.english': 'English',
    'settings.hindi': 'Hindi',
    'settings.telugu': 'Telugu',
    'settings.punjabi': 'Punjabi',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.courses': 'Courses',
    'nav.assignments': 'Assignments',
    'nav.classes': 'Classes',
    'nav.library': 'Library',
    'nav.notes': 'Notes',
    'nav.settings': 'Settings',
    'nav.notifications': 'Notifications',
    'nav.analytics': 'Analytics',
    'nav.announcements': 'Announcements',
    'nav.queries': 'Queries',
    
    // Roles
    'role.student': 'Student',
    'role.teacher': 'Teacher',
    'role.admin': 'Admin',
    'role.select': 'Select Your Role',
    
    // Messages
    'message.success': 'Operation completed successfully',
    'message.error': 'An error occurred',
    'message.confirmDelete': 'Are you sure you want to delete this?',
    
    // Teacher Dashboard
    'teacher.dashboard': 'Teacher Dashboard',
    'teacher.welcomeBack': 'Welcome back',
    'teacher.totalCourses': 'Total Courses',
    'teacher.totalStudents': 'Total Students',
    'teacher.pendingReviews': 'Pending Reviews',
    'teacher.avgAttendance': 'Avg. Attendance',
    'teacher.activeCourses': 'Active courses',
    'teacher.enrolledStudents': 'Enrolled students',
    'teacher.assignmentsToGrade': 'Assignments to grade',
    'teacher.recentQueries': 'Recent Student Queries',
    'teacher.attendanceManagement': 'Attendance Management',
    'teacher.trackManageAttendance': 'Track and manage student attendance',
    'teacher.todaysAttendance': "Today's Attendance",
    'teacher.markAttendance': 'Mark Attendance',
    'teacher.markAttendanceForClasses': 'Mark attendance for your classes',
    'teacher.studentQueries': 'Student Queries',
    'teacher.answerQuestions': 'Answer student questions and provide support',
    'teacher.teachingAnalytics': 'Teaching Analytics',
    'teacher.resources': 'Resources',
    'teacher.teachingResources': 'Teaching Resources',
    'teacher.uploadManageResources': 'Upload and manage your teaching resources',
    'teacher.myResources': 'My Resources',
    'teacher.logout': 'Logout',
    
    // Student Dashboard
    'student.dashboard': 'Student Dashboard',
    'student.totalCourses': 'Total Courses',
    'student.completed': 'Completed',
    'student.pendingAssignments': 'Pending Assignments',
    'student.attendance': 'Attendance',
    'student.attendanceTracking': 'Attendance',
    'student.trackAttendance': 'Track your class attendance',
    'student.attendanceOverview': 'Attendance Overview',
    'student.attendanceRecord': 'Your attendance record for this semester',
    'student.overallAttendance': 'Overall Attendance',
    'student.classes': 'classes',
    'student.doubtClearance': 'Doubt Clearance',
    'student.askQuestions': 'Ask questions and get help from teachers',
    'student.askQuestion': 'Ask a Question',
    'student.submitDoubts': 'Submit your doubts to your teachers',
    'student.selectCourse': 'Select Course',
    'student.submitQuestion': 'Submit Question',
    'student.typeQuestion': 'Type your question here...',
    'student.recentQuestions': 'Recent Questions',
    'student.previouslyAsked': 'Your previously asked questions',
    'student.answered': 'Answered',
    'student.pending': 'Pending',
    'student.progress': 'Progress',
    'student.progressTracking': 'Progress Tracking',
    'student.monitorProgress': 'Monitor your learning progress',
    'student.overallProgress': 'Overall Progress',
    'student.courseProgress': 'Course Progress',
    'student.library': 'Library',
    'student.libraryResources': 'Library Resources',
    
    // Assignment Dialog
    'assignment.create': 'Create New Assignment',
    'assignment.course': 'Course',
    'assignment.selectCourse': 'Select a course',
    'assignment.title': 'Assignment Title',
    'assignment.placeholder': 'e.g., Final Project Report',
    'assignment.description': 'Description',
    'assignment.provideDetails': 'Provide details about the assignment...',
    'assignment.dueDate': 'Due Date',
    'assignment.maxScore': 'Maximum Score',
    'assignment.creating': 'Creating...',
    'assignment.createAssignment': 'Create Assignment',
    
    // Grade Dialog
    'grade.title': 'Grade Submission',
    'grade.updateGrade': 'Update Grade',
    'grade.studentSubmission': 'Student Submission:',
    'grade.noTextSubmission': 'No text submission',
    'grade.outOf': 'Grade (out of',
    'grade.feedback': 'Feedback',
    'grade.provideFeedback': 'Provide feedback to the student...',
    'grade.saving': 'Saving...',
    'grade.saveGrade': 'Save Grade',
    
    // Submit Dialog
    'submit.title': 'Submit Assignment',
    'submit.updateSubmission': 'Update Your Submission',
    'submit.yourSubmission': 'Your Submission',
    'submit.enterSubmission': 'Enter your assignment submission here...',
    'submit.submitting': 'Submitting...',
    'submit.update': 'Update',
    
    // Class Dialog
    'class.create': 'Create New Class',
    'class.title': 'Class Title',
    'class.description': 'Description',
    'class.type': 'Class Type',
    'class.selectType': 'Select type',
    'class.scheduledDateTime': 'Scheduled Date & Time',
    'class.videoUrl': 'Video URL (for recorded classes)',
    'class.transcript': 'Transcript',
    'class.allowDownload': 'Allow students to download this class',
    'class.creating': 'Creating...',
    'class.createClass': 'Create Class',
    
    // Course Dialog
    'course.create': 'Create New Course',
    'course.addCourse': 'Add a new course to your teaching portfolio',
    'course.title': 'Course Title',
    'course.placeholder': 'e.g., Advanced Mathematics',
    'course.description': 'Description',
    'course.describeLearning': 'Describe what students will learn...',
    'course.status': 'Status',
    'course.creating': 'Creating...',
    'course.createCourse': 'Create Course',
    
    // Notes
    'notes.create': 'Create New Note',
    'notes.edit': 'Edit Note',
    'notes.noteTitle': 'Note Title',
    'notes.selectType': 'Select note type',
    'notes.teachingNotes': 'Teaching Notes',
    'notes.learningNotes': 'Learning Notes',
    'notes.revisionNotes': 'Revision Notes',
    'notes.writeNotes': 'Write your notes here...',
    'notes.update': 'Update',
    'notes.saveNote': 'Save Note',
    
    // Admin
    'admin.dashboard': 'Admin Dashboard',
    'admin.platformSettings': 'Platform Settings',
    'admin.configureSettings': 'Configure system-wide settings',
    'admin.attendanceReports': 'Attendance Reports',
    'admin.platformAttendance': 'Platform-wide attendance analytics',
    'admin.platformAnalytics': 'Platform Analytics',
    'admin.platformResources': 'Platform Resources',
    'admin.manageResources': 'Manage system-wide resources',
    
    // Common UI
    'ui.noData': 'No data available',
    'ui.viewMore': 'View More',
    'ui.seeAll': 'See All',
    'ui.loading': 'Loading...',
    'ui.saveChanges': 'Save Changes',
    'ui.update': 'Update',
    'ui.delete': 'Delete',
    'ui.edit': 'Edit',
    'ui.cancel': 'Cancel',
  },
  hi: {
    // Common
    'common.welcome': 'स्वागत है',
    'common.loading': 'लोड हो रहा है...',
    'common.error': 'त्रुटि',
    'common.success': 'सफल',
    'common.cancel': 'रद्द करें',
    'common.save': 'सहेजें',
    'common.delete': 'हटाएं',
    'common.edit': 'संपादित करें',
    'common.create': 'बनाएं',
    'common.update': 'अपडेट करें',
    'common.submit': 'जमा करें',
    'common.close': 'बंद करें',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.actions': 'कार्रवाई',
    
    // Auth
    'auth.signIn': 'साइन इन करें',
    'auth.signUp': 'साइन अप करें',
    'auth.signOut': 'साइन आउट करें',
    'auth.email': 'ईमेल',
    'auth.password': 'पासवर्ड',
    'auth.fullName': 'पूरा नाम',
    'auth.forgotPassword': 'पासवर्ड भूल गए?',
    'auth.rememberMe': 'मुझे याद रखें',
    'auth.dontHaveAccount': 'खाता नहीं है?',
    'auth.alreadyHaveAccount': 'पहले से खाता है?',
    'auth.welcomeBack': 'वापसी पर स्वागत है!',
    'auth.signedOut': 'सफलतापूर्वक साइन आउट किया गया',
    
    // Dashboard
    'dashboard.title': 'डैशबोर्ड',
    'dashboard.overview': 'अवलोकन',
    'dashboard.stats': 'आंकड़े',
    'dashboard.recentActivity': 'हाल की गतिविधि',
    
    // Courses
    'courses.title': 'पाठ्यक्रम',
    'courses.myCourses': 'मेरे पाठ्यक्रम',
    'courses.explore': 'पाठ्यक्रम खोजें',
    'courses.create': 'पाठ्यक्रम बनाएं',
    'courses.manage': 'पाठ्यक्रम प्रबंधित करें',
    'courses.enroll': 'अभी नामांकन करें',
    'courses.enrolled': 'नामांकित',
    'courses.published': 'प्रकाशित',
    'courses.draft': 'ड्राफ्ट',
    'courses.noCourses': 'कोई पाठ्यक्रम उपलब्ध नहीं',
    'courses.noEnrolled': 'कोई नामांकित पाठ्यक्रम नहीं',
    'courses.startLearning': 'पाठ्यक्रम में नामांकन करके सीखना शुरू करें',
    'courses.description': 'पाठ्यक्रम जिनमें आप वर्तमान में नामांकित हैं',
    'courses.browse': 'उपलब्ध पाठ्यक्रम ब्राउज़ करें और नामांकन करें',
    
    // Assignments
    'assignments.title': 'असाइनमेंट',
    'assignments.create': 'असाइनमेंट बनाएं',
    'assignments.submit': 'असाइनमेंट जमा करें',
    'assignments.grade': 'ग्रेड',
    'assignments.graded': 'ग्रेडेड',
    'assignments.pending': 'लंबित',
    'assignments.submitted': 'जमा किया गया',
    'assignments.dueDate': 'नियत तारीख',
    'assignments.maxScore': 'अधिकतम अंक',
    'assignments.noAssignments': 'कोई असाइनमेंट उपलब्ध नहीं',
    'assignments.viewSubmit': 'अपने पाठ्यक्रम असाइनमेंट देखें और जमा करें',
    
    // Classes
    'classes.title': 'कक्षाएं',
    'classes.create': 'कक्षा बनाएं',
    'classes.live': 'लाइव कक्षा',
    'classes.recorded': 'रिकॉर्ड की गई कक्षा',
    'classes.scheduled': 'निर्धारित',
    'classes.ongoing': 'चल रही है',
    'classes.completed': 'पूर्ण',
    'classes.join': 'कक्षा में शामिल हों',
    'classes.watch': 'रिकॉर्डिंग देखें',
    
    // Settings
    'settings.title': 'सेटिंग्स',
    'settings.profile': 'प्रोफ़ाइल',
    'settings.account': 'खाता',
    'settings.preferences': 'प्राथमिकताएं',
    'settings.language': 'भाषा',
    'settings.theme': 'थीम',
    'settings.notifications': 'सूचनाएं',
    'settings.security': 'सुरक्षा',
    'settings.selectLanguage': 'भाषा चुनें',
    'settings.english': 'अंग्रेजी',
    'settings.hindi': 'हिंदी',
    'settings.telugu': 'तेलुगू',
    'settings.punjabi': 'पंजाबी',
    
    // Navigation
    'nav.dashboard': 'डैशबोर्ड',
    'nav.courses': 'पाठ्यक्रम',
    'nav.assignments': 'असाइनमेंट',
    'nav.classes': 'कक्षाएं',
    'nav.library': 'लाइब्रेरी',
    'nav.notes': 'नोट्स',
    'nav.settings': 'सेटिंग्स',
    'nav.notifications': 'सूचनाएं',
    'nav.analytics': 'विश्लेषण',
    'nav.announcements': 'घोषणाएं',
    'nav.queries': 'पूछताछ',
    
    // Roles
    'role.student': 'छात्र',
    'role.teacher': 'शिक्षक',
    'role.admin': 'व्यवस्थापक',
    'role.select': 'अपनी भूमिका चुनें',
    
    // Messages
    'message.success': 'ऑपरेशन सफलतापूर्वक पूरा हुआ',
    'message.error': 'एक त्रुटि हुई',
    'message.confirmDelete': 'क्या आप वाकई इसे हटाना चाहते हैं?',
  },
  te: {
    // Common
    'common.welcome': 'స్వాగతం',
    'common.loading': 'లోడ్ అవుతోంది...',
    'common.error': 'దోషం',
    'common.success': 'విజయం',
    'common.cancel': 'రద్దు చేయి',
    'common.save': 'సేవ్ చేయి',
    'common.delete': 'తొలగించు',
    'common.edit': 'సవరించు',
    'common.create': 'సృష్టించు',
    'common.update': 'నవీకరించు',
    'common.submit': 'సమర్పించు',
    'common.close': 'మూసివేయి',
    'common.search': 'శోధించు',
    'common.filter': 'ఫిల్టర్',
    'common.actions': 'చర్యలు',
    
    // Auth
    'auth.signIn': 'సైన్ ఇన్',
    'auth.signUp': 'సైన్ అప్',
    'auth.signOut': 'సైన్ అవుట్',
    'auth.email': 'ఇమెయిల్',
    'auth.password': 'పాస్వర్డ్',
    'auth.fullName': 'పూర్తి పేరు',
    'auth.forgotPassword': 'పాస్వర్డ్ మర్చిపోయారా?',
    'auth.rememberMe': 'నన్ను గుర్తుంచుకో',
    'auth.dontHaveAccount': 'ఖాతా లేదా?',
    'auth.alreadyHaveAccount': 'ఇప్పటికే ఖాతా ఉందా?',
    'auth.welcomeBack': 'మళ్లీ స్వాగతం!',
    'auth.signedOut': 'విజయవంతంగా సైన్ అవుట్ చేయబడింది',
    
    // Dashboard
    'dashboard.title': 'డాష్బోర్డ్',
    'dashboard.overview': 'అవలోకనం',
    'dashboard.stats': 'గణాంకాలు',
    'dashboard.recentActivity': 'ఇటీవలి కార్యకలాపాలు',
    
    // Courses
    'courses.title': 'కోర్సులు',
    'courses.myCourses': 'నా కోర్సులు',
    'courses.explore': 'కోర్సులు అన్వేషించండి',
    'courses.create': 'కోర్స్ సృష్టించండి',
    'courses.manage': 'కోర్సులు నిర్వహించండి',
    'courses.enroll': 'ఇప్పుడే నమోదు చేయండి',
    'courses.enrolled': 'నమోదు చేయబడింది',
    'courses.published': 'ప్రచురించబడింది',
    'courses.draft': 'డ్రాఫ్ట్',
    'courses.noCourses': 'కోర్సులు అందుబాటులో లేవు',
    'courses.noEnrolled': 'నమోదు చేయబడిన కోర్సులు లేవు',
    'courses.startLearning': 'కోర్సులో నమోదు చేయడం ద్వారా నేర్చడం ప్రారంభించండి',
    'courses.description': 'మీరు ప్రస్తుతం నమోదు చేసుకున్న కోర్సులు',
    'courses.browse': 'అందుబాటులో ఉన్న కోర్సులను బ్రౌజ్ చేసి నమోదు చేయండి',
    
    // Assignments
    'assignments.title': 'అసైన్మెంట్లు',
    'assignments.create': 'అసైన్మెంట్ సృష్టించండి',
    'assignments.submit': 'అసైన్మెంట్ సమర్పించండి',
    'assignments.grade': 'గ్రేడ్',
    'assignments.graded': 'గ్రేడ్ చేయబడింది',
    'assignments.pending': 'పెండింగ్',
    'assignments.submitted': 'సమర్పించబడింది',
    'assignments.dueDate': 'డ్యూ తేదీ',
    'assignments.maxScore': 'గరిష్ట స్కోర్',
    'assignments.noAssignments': 'అసైన్మెంట్లు అందుబాటులో లేవు',
    'assignments.viewSubmit': 'మీ కోర్స్ అసైన్మెంట్లను వీక్షించండి మరియు సమర్పించండి',
    
    // Classes
    'classes.title': 'తరగతులు',
    'classes.create': 'తరగతి సృష్టించండి',
    'classes.live': 'లైవ్ తరగతి',
    'classes.recorded': 'రికార్డ్ చేయబడిన తరగతి',
    'classes.scheduled': 'షెడ్యూల్ చేయబడింది',
    'classes.ongoing': 'కొనసాగుతోంది',
    'classes.completed': 'పూర్తయింది',
    'classes.join': 'తరగతిలో చేరండి',
    'classes.watch': 'రికార్డింగ్ చూడండి',
    
    // Settings
    'settings.title': 'సెట్టింగ్లు',
    'settings.profile': 'ప్రొఫైల్',
    'settings.account': 'ఖాతా',
    'settings.preferences': 'ప్రాధాన్యతలు',
    'settings.language': 'భాష',
    'settings.theme': 'థీమ్',
    'settings.notifications': 'నోటిఫికేషన్లు',
    'settings.security': 'భద్రత',
    'settings.selectLanguage': 'భాష ఎంచుకోండి',
    'settings.english': 'ఆంగ్లం',
    'settings.hindi': 'హిందీ',
    'settings.telugu': 'తెలుగు',
    'settings.punjabi': 'పంజాబీ',
    
    // Navigation
    'nav.dashboard': 'డాష్బోర్డ్',
    'nav.courses': 'కోర్సులు',
    'nav.assignments': 'అసైన్మెంట్లు',
    'nav.classes': 'తరగతులు',
    'nav.library': 'లైబ్రరీ',
    'nav.notes': 'నోట్స్',
    'nav.settings': 'సెట్టింగ్లు',
    'nav.notifications': 'నోటిఫికేషన్లు',
    'nav.analytics': 'విశ్లేషణ',
    'nav.announcements': 'ప్రకటనలు',
    'nav.queries': 'ప్రశ్నలు',
    
    // Roles
    'role.student': 'విద్యార్థి',
    'role.teacher': 'ఉపాధ్యాయుడు',
    'role.admin': 'నిర్వాహకుడు',
    'role.select': 'మీ పాత్రను ఎంచుకోండి',
    
    // Messages
    'message.success': 'ఆపరేషన్ విజయవంతంగా పూర్తయింది',
    'message.error': 'దోషం సంభవించింది',
    'message.confirmDelete': 'మీరు దీన్ని తొలగించాలని ఖచ్చితంగా అనుకుంటున్నారా?',
  },
  pa: {
    // Common
    'common.welcome': 'ਜੀ ਆਇਆਂ ਨੂੰ',
    'common.loading': 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...',
    'common.error': 'ਗਲਤੀ',
    'common.success': 'ਸਫਲ',
    'common.cancel': 'ਰੱਦ ਕਰੋ',
    'common.save': 'ਸੇਵ ਕਰੋ',
    'common.delete': 'ਮਿਟਾਓ',
    'common.edit': 'ਸੰਪਾਦਨ ਕਰੋ',
    'common.create': 'ਬਣਾਓ',
    'common.update': 'ਅਪਡੇਟ ਕਰੋ',
    'common.submit': 'ਜਮ੍ਹਾ ਕਰੋ',
    'common.close': 'ਬੰਦ ਕਰੋ',
    'common.search': 'ਖੋਜੋ',
    'common.filter': 'ਫਿਲਟਰ',
    'common.actions': 'ਕਾਰਵਾਈਆਂ',
    
    // Auth
    'auth.signIn': 'ਸਾਈਨ ਇਨ',
    'auth.signUp': 'ਸਾਈਨ ਅਪ',
    'auth.signOut': 'ਸਾਈਨ ਆਉਟ',
    'auth.email': 'ਈਮੇਲ',
    'auth.password': 'ਪਾਸਵਰਡ',
    'auth.fullName': 'ਪੂਰਾ ਨਾਮ',
    'auth.forgotPassword': 'ਪਾਸਵਰਡ ਭੁੱਲ ਗਏ?',
    'auth.rememberMe': 'ਮੈਨੂੰ ਯਾਦ ਰੱਖੋ',
    'auth.dontHaveAccount': 'ਖਾਤਾ ਨਹੀਂ ਹੈ?',
    'auth.alreadyHaveAccount': 'ਪਹਿਲਾਂ ਤੋਂ ਖਾਤਾ ਹੈ?',
    'auth.welcomeBack': 'ਵਾਪਸੀ ਤੇ ਜੀ ਆਇਆਂ ਨੂੰ!',
    'auth.signedOut': 'ਸਫਲਤਾਪੂਰਵਕ ਸਾਈਨ ਆਉਟ ਕੀਤਾ ਗਿਆ',
    
    // Dashboard
    'dashboard.title': 'ਡੈਸ਼ਬੋਰਡ',
    'dashboard.overview': 'ਝਲਕ',
    'dashboard.stats': 'ਆਂਕੜੇ',
    'dashboard.recentActivity': 'ਹਾਲੀਆ ਗਤਿਵਿਧੀਆਂ',
    
    // Courses
    'courses.title': 'ਕੋਰਸ',
    'courses.myCourses': 'ਮੇਰੇ ਕੋਰਸ',
    'courses.explore': 'ਕੋਰਸ ਖੋਜੋ',
    'courses.create': 'ਕੋਰਸ ਬਣਾਓ',
    'courses.manage': 'ਕੋਰਸ ਪ੍ਰਬੰਧਿਤ ਕਰੋ',
    'courses.enroll': 'ਹੁਣੇ ਦਾਖਲਾ ਲਓ',
    'courses.enrolled': 'ਦਾਖਲ ਹੋਇਆ',
    'courses.published': 'ਪ੍ਰਕਾਸ਼ਿਤ',
    'courses.draft': 'ਡਰਾਫਟ',
    'courses.noCourses': 'ਕੋਈ ਕੋਰਸ ਉਪਲਬਧ ਨਹੀਂ',
    'courses.noEnrolled': 'ਕੋਈ ਦਾਖਲ ਕੋਰਸ ਨਹੀਂ',
    'courses.startLearning': 'ਕੋਰਸ ਵਿੱਚ ਦਾਖਲਾ ਲੈ ਕੇ ਸਿੱਖਣਾ ਸ਼ੁਰੂ ਕਰੋ',
    'courses.description': 'ਕੋਰਸ ਜਿਨ੍ਹਾਂ ਵਿੱਚ ਤੁਸੀਂ ਹੁਣ ਦਾਖਲ ਹੋ',
    'courses.browse': 'ਉਪਲਬਧ ਕੋਰਸ ਬ੍ਰਾਊਜ਼ ਕਰੋ ਅਤੇ ਦਾਖਲਾ ਲਓ',
    
    // Assignments
    'assignments.title': 'ਅਸਾਈਨਮੈਂਟ',
    'assignments.create': 'ਅਸਾਈਨਮੈਂਟ ਬਣਾਓ',
    'assignments.submit': 'ਅਸਾਈਨਮੈਂਟ ਜਮ੍ਹਾ ਕਰੋ',
    'assignments.grade': 'ਗ੍ਰੇਡ',
    'assignments.graded': 'ਗ੍ਰੇਡ ਕੀਤਾ',
    'assignments.pending': 'ਲੰਬਿਤ',
    'assignments.submitted': 'ਜਮ੍ਹਾ ਕੀਤਾ ਗਿਆ',
    'assignments.dueDate': 'ਡਿਊ ਤਾਰੀਖ',
    'assignments.maxScore': 'ਵੱਧ ਤੋਂ ਵੱਧ ਸਕੋਰ',
    'assignments.noAssignments': 'ਕੋਈ ਅਸਾਈਨਮੈਂਟ ਉਪਲਬਧ ਨਹੀਂ',
    'assignments.viewSubmit': 'ਆਪਣੇ ਕੋਰਸ ਅਸਾਈਨਮੈਂਟ ਦੇਖੋ ਅਤੇ ਜਮ੍ਹਾ ਕਰੋ',
    
    // Classes
    'classes.title': 'ਕਲਾਸਾਂ',
    'classes.create': 'ਕਲਾਸ ਬਣਾਓ',
    'classes.live': 'ਲਾਈਵ ਕਲਾਸ',
    'classes.recorded': 'ਰਿਕਾਰਡ ਕੀਤੀ ਕਲਾਸ',
    'classes.scheduled': 'ਸ਼ੈਡਿਊਲ',
    'classes.ongoing': 'ਚਲ ਰਹੀ ਹੈ',
    'classes.completed': 'ਪੂਰਾ',
    'classes.join': 'ਕਲਾਸ ਵਿੱਚ ਸ਼ਾਮਲ ਹੋਵੋ',
    'classes.watch': 'ਰਿਕਾਰਡਿੰਗ ਦੇਖੋ',
    
    // Settings
    'settings.title': 'ਸੈਟਿੰਗਾਂ',
    'settings.profile': 'ਪ੍ਰੋਫਾਈਲ',
    'settings.account': 'ਖਾਤਾ',
    'settings.preferences': 'ਤਰਜੀਹਾਂ',
    'settings.language': 'ਭਾਸ਼ਾ',
    'settings.theme': 'ਥੀਮ',
    'settings.notifications': 'ਸੂਚਨਾਵਾਂ',
    'settings.security': 'ਸੁਰੱਖਿਆ',
    'settings.selectLanguage': 'ਭਾਸ਼ਾ ਚੁਣੋ',
    'settings.english': 'ਅੰਗਰੇਜ਼ੀ',
    'settings.hindi': 'ਹਿੰਦੀ',
    'settings.telugu': 'ਤੇਲਗੂ',
    'settings.punjabi': 'ਪੰਜਾਬੀ',
    
    // Navigation
    'nav.dashboard': 'ਡੈਸ਼ਬੋਰਡ',
    'nav.courses': 'ਕੋਰਸ',
    'nav.assignments': 'ਅਸਾਈਨਮੈਂਟ',
    'nav.classes': 'ਕਲਾਸਾਂ',
    'nav.library': 'ਲਾਇਬ੍ਰੇਰੀ',
    'nav.notes': 'ਨੋਟਸ',
    'nav.settings': 'ਸੈਟਿੰਗਾਂ',
    'nav.notifications': 'ਸੂਚਨਾਵਾਂ',
    'nav.analytics': 'ਵਿਸ਼ਲੇਸ਼ਣ',
    'nav.announcements': 'ਘੋਸ਼ਣਾਵਾਂ',
    'nav.queries': 'ਪੁੱਛਗਿੱਛ',
    
    // Roles
    'role.student': 'ਵਿਦਿਆਰਥੀ',
    'role.teacher': 'ਅਧਿਆਪਕ',
    'role.admin': 'ਪ੍ਰਬੰਧਕ',
    'role.select': 'ਆਪਣੀ ਭੂਮਿਕਾ ਚੁਣੋ',
    
    // Messages
    'message.success': 'ਓਪਰੇਸ਼ਨ ਸਫਲਤਾਪੂਰਵਕ ਪੂਰਾ ਹੋਇਆ',
    'message.error': 'ਇੱਕ ਗਲਤੀ ਆਈ',
    'message.confirmDelete': 'ਕੀ ਤੁਸੀਂ ਯਕੀਨਨ ਇਸਨੂੰ ਮਿਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?',
  },
};

