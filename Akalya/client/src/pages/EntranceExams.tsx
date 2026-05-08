import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { entranceExamsAPI } from "@/lib/api";
import { FileQuestion, MapPin, ArrowRight, ExternalLink } from "lucide-react";

const STATES = ["Telangana", "Andhra Pradesh", "Karnataka", "Maharashtra", "Tamil Nadu", "All"];

export function EntranceExamsList({ detailBasePath = "/entrance-exams" }: { detailBasePath?: string }) {
  const [levelFilter, setLevelFilter] = useState<string>("after12th");
  const [stateFilter, setStateFilter] = useState<string>("all");

  const entranceExamsData: Record<string, Record<string, { name: string; state: string; overview: string; officialWebsite: string; }[]>> = {
    after10th: {
      national: [
        { name: "NTSE (National Talent Search Examination)", state: "National", overview: "National level scholarship program for 10th class students.", officialWebsite: "https://ncert.nic.in" },
        { name: "Indian Army Boys Sports Company", state: "National", overview: "Entry for young boys into sports and army.", officialWebsite: "https://joinindianarmy.nic.in" }
      ],
      ap: [
        { name: "AP POLYCET", state: "Andhra Pradesh", overview: "Admission into Diploma level programs in Govt, Aided, Private, Un-aided Polytechnics.", officialWebsite: "https://polycetap.nic.in" },
        { name: "APRJC CET", state: "Andhra Pradesh", overview: "Admission into AP Residential Junior Colleges.", officialWebsite: "https://aprs.apcfss.in" }
      ],
      ts: [
        { name: "TS POLYCET", state: "Telangana", overview: "Admission into Diploma Courses in Polytechnics in Telangana.", officialWebsite: "https://polycet.sbtet.telangana.gov.in" },
        { name: "TSRJC CET", state: "Telangana", overview: "Admission to Telangana Residential Junior Colleges.", officialWebsite: "https://tsrjdc.cgg.gov.in" }
      ],
      ka: [
        { name: "Karnataka Polytechnic Admission", state: "Karnataka", overview: "Merit-based admission to diploma courses in Karnataka.", officialWebsite: "https://dtetech.karnataka.gov.in" }
      ],
      mh: [
        { name: "MSBTE Diploma Admission", state: "Maharashtra", overview: "Admission to first year diploma in engineering/technology.", officialWebsite: "https://msbte.org.in" }
      ],
      tn: [
        { name: "TN Polytechnic Admission", state: "Tamil Nadu", overview: "Admission to diploma courses in Tamil Nadu.", officialWebsite: "https://tndte.gov.in" }
      ]
    },
    after12th: {
      national: [
        { name: "JEE Main", state: "National", overview: "Joint Entrance Examination for Engineering (NITs, IIITs).", officialWebsite: "https://jeemain.nta.nic.in" },
        { name: "NEET UG", state: "National", overview: "National Eligibility cum Entrance Test for Medical/Dental.", officialWebsite: "https://neet.nta.nic.in" },
        { name: "CUET UG", state: "National", overview: "Common University Entrance Test for Undergrad programs in Central Universities.", officialWebsite: "https://cuet.samarth.ac.in" },
        { name: "NDA", state: "National", overview: "National Defence Academy Examination for Army, Navy and Air Force.", officialWebsite: "https://upsc.gov.in" },
        { name: "CLAT", state: "National", overview: "Common Law Admission Test for National Law Universities.", officialWebsite: "https://consortiumofnlus.ac.in" }
      ],
      ap: [
        { name: "AP EAPCET (EAMCET)", state: "Andhra Pradesh", overview: "Engineering, Agriculture and Pharmacy Common Entrance Test.", officialWebsite: "https://cets.apsche.ap.gov.in" }
      ],
      ts: [
        { name: "TS EAPCET (EAMCET)", state: "Telangana", overview: "Engineering, Agricultural and Medical Common Entrance Test.", officialWebsite: "https://eapcet.tsche.ac.in" }
      ],
      ka: [
        { name: "KCET", state: "Karnataka", overview: "Karnataka Common Entrance Test for Engineering, Pharmacy, Agriculture.", officialWebsite: "https://cetonline.karnataka.gov.in/kea" },
        { name: "COMEDK UGET", state: "Karnataka", overview: "Under Graduate Entrance Test for Engineering Colleges in Karnataka.", officialWebsite: "https://www.comedk.org" }
      ],
      mh: [
        { name: "MHT CET", state: "Maharashtra", overview: "Maharashtra Common Entrance Test for Engineering and Pharmacy.", officialWebsite: "https://cetcell.mahacet.org" }
      ],
      tn: [
        { name: "TNEA", state: "Tamil Nadu", overview: "Tamil Nadu Engineering Admissions (Merit-based counselling).", officialWebsite: "https://www.tneaonline.org" },
        { name: "TNAU Admission", state: "Tamil Nadu", overview: "Tamil Nadu Agricultural University Admission.", officialWebsite: "https://tnau.ac.in" }
      ]
    }
  };

  const getFilteredExams = () => {
    let list: any[] = [];
    const levelData = entranceExamsData[levelFilter];
    if (levelData) {
      if (stateFilter === "all") {
        Object.values(levelData).forEach(arr => {
          list = [...list, ...arr];
        });
      } else {
        list = levelData[stateFilter] || [];
      }
    }
    return list;
  };

  const list = getFilteredExams();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Entrance Exams</h1>
        <p className="text-muted-foreground">
          Find National and State-level Entrance Exams for After 10th and After 12th.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Education Level</label>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="after10th">After 10th</SelectItem>
              <SelectItem value="after12th">After 12th</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">State / Region</label>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States & National</SelectItem>
              <SelectItem value="national">National Level</SelectItem>
              <SelectItem value="ap">Andhra Pradesh</SelectItem>
              <SelectItem value="ts">Telangana</SelectItem>
              <SelectItem value="tn">Tamil Nadu</SelectItem>
              <SelectItem value="ka">Karnataka</SelectItem>
              <SelectItem value="mh">Maharashtra</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No exams match your filters. Try changing filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e, idx) => (
            <Card key={`${e.name}-${idx}`} className="hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <FileQuestion className="h-6 w-6 text-primary" />
                  <Badge variant="secondary">{e.state}</Badge>
                </div>
                <CardTitle className="text-lg leading-tight">{e.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                <CardDescription className="flex-1 line-clamp-3">{e.overview}</CardDescription>
                <div className="mt-auto">
                  <a href={e.officialWebsite.startsWith("http") ? e.officialWebsite : `https://${e.officialWebsite}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      Official Website / Apply <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function EntranceExamDetail({ embedded }: { embedded?: boolean }) {
  const { slug } = useParams<{ slug: string }>();
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const backTo = embedded ? "/dashboard/student/career-gateway/entrance-exams" : "/entrance-exams";

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    entranceExamsAPI.getBySlug(slug).then(setExam).catch(() => setExam(null))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [slug]);

  if (loading) {
    const load = <div className="container py-8">Loading...</div>;
    if (embedded) return load;
    return <AppLayout>{load}</AppLayout>;
  }
  if (!exam) {
    const err = <div className="container py-8">Exam not found.</div>;
    if (embedded) return err;
    return <AppLayout>{err}</AppLayout>;
  }

  const sections = [
    { title: "Overview", text: exam.overview },
    { title: "Eligibility", text: exam.eligibility },
    { title: "Age limit", text: exam.ageLimit },
    { title: "Exam pattern", text: exam.examPattern },
    { title: "Syllabus", text: exam.syllabus },
    { title: "Important dates", text: exam.importantDates },
    { title: "Career opportunities", text: exam.careerOpportunities },
  ];

  const content = (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to={backTo} className="text-sm text-primary hover:underline mb-2 inline-block">← Back to exams</Link>
          <h1 className="text-3xl font-bold">{exam.name}</h1>
          {exam.state && <Badge className="mt-2">{exam.state}</Badge>}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {sections.filter((s) => s.text).map((s) => (
              <Card key={s.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{s.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{s.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Official website</CardTitle>
              </CardHeader>
              <CardContent>
                {exam.officialWebsite ? (
                  <a href={exam.officialWebsite.startsWith("http") ? exam.officialWebsite : `https://${exam.officialWebsite}`} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-2 hover:underline">
                    <ExternalLink className="h-4 w-4" />
                    Official Website
                  </a>
                ) : (
                  <p className="text-muted-foreground">Not provided</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
  if (embedded) return content;
  return <AppLayout>{content}</AppLayout>;
}

export default function EntranceExams({ embedded }: { embedded?: boolean }) {
  const detailBasePath = embedded ? "/dashboard/student/career-gateway/entrance-exams" : "/entrance-exams";
  const list = <EntranceExamsList detailBasePath={detailBasePath} />;
  if (embedded) return list;
  return <AppLayout>{list}</AppLayout>;
}
