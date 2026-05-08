import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { scholarshipsAPI } from "@/lib/api";
import { format } from "date-fns";
import { Award, ExternalLink, Calendar } from "lucide-react";

export default function Scholarships({ embedded }: { embedded?: boolean }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("merit");
  const [forClass, setForClass] = useState<string>("class10");

  const scholarshipData: Record<string, Record<string, { title: string; provider: string; amount: string; eligibility: string; deadline: string; applicationUrl: string; category: string; }[]>> = {
    merit: {
      class10: [
        { title: "National Means-cum-Merit Scholarship (NMMS)", provider: "Ministry of Education, Govt. of India", amount: "₹12,000/year", eligibility: "Class 8 pass, family income ≤ ₹3.5 lakh/year, govt school student", deadline: "November (state-wise)", applicationUrl: "https://scholarships.gov.in", category: "Central Govt" },
        { title: "INSPIRE Scholarship (SHE) – Class 10 Top", provider: "Dept. of Science & Technology", amount: "₹80,000/year", eligibility: "Top 1% in Class 10 board, pursuing science at Class 11", deadline: "October 31", applicationUrl: "https://online-inspire.gov.in", category: "Science" },
        { title: "Pragati Scholarship (AICTE)", provider: "AICTE", amount: "₹50,000/year", eligibility: "Girl students, rural area, family income ≤ ₹8 lakh", deadline: "December", applicationUrl: "https://scholarships.gov.in", category: "Girls" },
        { title: "Dr. APJ Abdul Kalam Ignite Award", provider: "National Innovation Foundation", amount: "₹10,000 + certificate", eligibility: "Innovative idea by students up to Class 12", deadline: "August 31", applicationUrl: "https://nif.org.in", category: "Innovation" },
        { title: "Vidyasiri Scholarship (Karnataka)", provider: "Karnataka Govt.", amount: "₹10,000–₹30,000/year", eligibility: "State board toppers, rural domicile required", deadline: "September", applicationUrl: "https://karepass.cgg.gov.in", category: "State Govt" },
      ],
      class12: [
        { title: "Central Sector Scheme of Scholarships (CSSS)", provider: "Ministry of Education", amount: "₹10,000–₹20,000/year", eligibility: "Top 20 percentile in Class 12, family income ≤ ₹8 lakh", deadline: "October 31", applicationUrl: "https://scholarships.gov.in", category: "Central Govt" },
        { title: "INSPIRE Scholarship (SHE) – Class 12", provider: "DST, Govt. of India", amount: "₹80,000/year", eligibility: "Top 1% in Class 12, enrolled BSc/Integrated MSc Natural Sciences", deadline: "October 31", applicationUrl: "https://online-inspire.gov.in", category: "Science" },
        { title: "KVPY Fellowship", provider: "IISc Bangalore / DST", amount: "₹5,000–₹7,000/month + contingency", eligibility: "Class 12 / 1st yr BSc, aptitude test + interview", deadline: "September", applicationUrl: "https://kvpy.iisc.ac.in", category: "Research" },
        { title: "Post-Matric Scholarship (State Merit)", provider: "State Social Welfare Depts.", amount: "₹5,000–₹15,000/year", eligibility: "Rural students ≥ 60% in Class 11, income ≤ ₹1 lakh", deadline: "October", applicationUrl: "https://scholarships.gov.in", category: "State Govt" },
        { title: "GE Foundation Scholar-Leaders Programme", provider: "GE Foundation India", amount: "₹1 lakh/year", eligibility: "Girls in STEM, rural background, income ≤ ₹3 lakh", deadline: "June", applicationUrl: "https://www.b4s.in", category: "STEM Girls" },
      ],
      graduation: [
        { title: "Prime Minister's Scholarship Scheme (PMSS)", provider: "Ministry of Home Affairs", amount: "₹30,000–₹36,000/year", eligibility: "Wards of ex-servicemen/paramilitary, min 60% in Class 12", deadline: "October 15", applicationUrl: "https://ksb.gov.in", category: "Central Govt" },
        { title: "INSPIRE Scholarship – BSc/Integrated MSc", provider: "DST", amount: "₹80,000/year + ₹20,000 research", eligibility: "Top 1% in Class 12, natural sciences", deadline: "October 31", applicationUrl: "https://online-inspire.gov.in", category: "Research" },
        { title: "Indira Gandhi Scholarship for Single Girl Child", provider: "UGC", amount: "₹36,200/year", eligibility: "Single girl child, PG programmes in any university", deadline: "October", applicationUrl: "https://www.ugc.gov.in", category: "Girls" },
        { title: "Ishan Uday (North-East Region)", provider: "UGC", amount: "₹5,400–₹7,800/month", eligibility: "North-East domicile in general degree colleges", deadline: "October", applicationUrl: "https://scholarships.gov.in", category: "Regional" },
        { title: "Reliance Foundation Scholarship", provider: "Reliance Foundation", amount: "₹4 lakh (4 years)", eligibility: "Rural, family income ≤ ₹2.5 lakh, STEM/Liberal Arts", deadline: "June", applicationUrl: "https://rf.foundation/scholarships", category: "Corporate" },
      ],
    },
    need: {
      class10: [
        { title: "Mukhyamantri Medhavi Vidyarthi Yojana (MP)", provider: "Govt. of Madhya Pradesh", amount: "Full tuition fee waiver", eligibility: "Family income ≤ ₹6 lakh, MP board ≥ 70% / CBSE ≥ 85%", deadline: "August", applicationUrl: "http://scholarshipportal.mp.nic.in", category: "State Govt" },
        { title: "Swami Vivekananda Merit-cum-Means (WB)", provider: "Govt. of West Bengal", amount: "₹12,000–₹60,000/year", eligibility: "Class 10 pass, rural WB domicile, income ≤ ₹2.5 lakh", deadline: "November", applicationUrl: "https://svmcm.wbhed.gov.in", category: "State Govt" },
        { title: "NSP Pre-Matric Scholarship – Minorities", provider: "Ministry of Minority Affairs", amount: "₹1,000–₹10,000/year", eligibility: "Muslim/Sikh/Christian/Buddhist student, income ≤ ₹1 lakh", deadline: "October 31", applicationUrl: "https://scholarships.gov.in", category: "Minority" },
        { title: "Aam Aadmi Scholarship (Delhi)", provider: "Govt. of Delhi", amount: "₹5,000–₹25,000/year", eligibility: "Delhi domicile, income ≤ ₹2.5 lakh, Class 9–12", deadline: "September", applicationUrl: "https://edistrict.delhigovt.nic.in", category: "State Govt" },
        { title: "e-Grantz Scholarship (Kerala)", provider: "Govt. of Kerala", amount: "₹5,000–₹15,000/year", eligibility: "Kerala domicile, rural area, income ≤ ₹1 lakh", deadline: "November", applicationUrl: "https://egrantz.kerala.gov.in", category: "State Govt" },
      ],
      class12: [
        { title: "Post-Matric Scholarship – General/EWS", provider: "State Govts. / MoSJE", amount: "₹3,000–₹10,000/year", eligibility: "EWS/OBC, Class 11–12, income ≤ ₹1 lakh", deadline: "October 31", applicationUrl: "https://scholarships.gov.in", category: "EWS/OBC" },
        { title: "NSP Post-Matric – Minority", provider: "Ministry of Minority Affairs", amount: "₹13,500–₹20,000/year", eligibility: "Minority community, income ≤ ₹2 lakh, ≥ 50% marks", deadline: "October 31", applicationUrl: "https://scholarships.gov.in", category: "Minority" },
        { title: "Apaar Scholarship (Tata Trusts)", provider: "Tata Trusts", amount: "₹30,000/year", eligibility: "Rural girl, income ≤ ₹3 lakh, Science/Commerce stream", deadline: "September", applicationUrl: "https://www.tatatrusts.org", category: "NGO" },
        { title: "Vidyalakshmi Education Loan + Interest Subsidy", provider: "Dept. of Financial Services", amount: "Interest subsidy on education loan", eligibility: "Merit-based, recognised institution, income ≤ ₹4.5 lakh", deadline: "Rolling", applicationUrl: "https://www.vidyalakshmi.co.in", category: "Loan+Scholarship" },
        { title: "Sitaram Jindal Foundation Scholarship", provider: "Sitaram Jindal Foundation", amount: "₹1,000–₹3,000/month", eligibility: "All streams, income ≤ ₹3 lakh, rural domicile preferred", deadline: "September 30", applicationUrl: "https://sitaramjindalfoundation.org", category: "Foundation" },
      ],
      graduation: [
        { title: "Pragati Scholarship – AICTE (Graduation)", provider: "AICTE", amount: "₹50,000/year + ₹30,000 incidental", eligibility: "Girl, AICTE-approved tech institution, income ≤ ₹8 lakh", deadline: "November", applicationUrl: "https://scholarships.gov.in", category: "Girls/Technical" },
        { title: "NSP Post-Matric Minority – Degree Level", provider: "Ministry of Minority Affairs", amount: "₹20,000–₹25,000/year", eligibility: "Minority, degree/diploma, income ≤ ₹2 lakh, ≥ 50%", deadline: "October 31", applicationUrl: "https://scholarships.gov.in", category: "Minority" },
        { title: "Sitaram Jindal Foundation Scholarship (UG)", provider: "Sitaram Jindal Foundation", amount: "₹1,000–₹3,000/month", eligibility: "All disciplines, income ≤ ₹3 lakh, rural domicile preferred", deadline: "September 30", applicationUrl: "https://sitaramjindalfoundation.org", category: "Foundation" },
        { title: "L'Oréal India For Young Women in Science", provider: "L'Oréal – UNESCO", amount: "₹2.5 lakh", eligibility: "Female, BSc/Integrated MSc STEM, ≥ 60% marks", deadline: "July", applicationUrl: "https://www.lorealindia.com/csr", category: "Science Girls" },
        { title: "Reliance Foundation Scholarship (UG)", provider: "Reliance Foundation", amount: "Up to ₹4 lakh (4 years)", eligibility: "Rural, income ≤ ₹2.5 lakh, STEM or Liberal Arts", deadline: "June", applicationUrl: "https://rf.foundation/scholarships", category: "Corporate" },
      ],
    },
    caste: {
      class10: [
        { title: "Pre-Matric Scholarship – SC Students", provider: "Ministry of Social Justice", amount: "₹1,500–₹7,000/year", eligibility: "SC category, Class 9–10, income ≤ ₹2.5 lakh", deadline: "October 31", applicationUrl: "https://scholarships.gov.in", category: "SC" },
        { title: "Pre-Matric Scholarship – ST Students", provider: "Ministry of Tribal Affairs", amount: "₹1,500–₹7,000/year", eligibility: "ST category, Class 9–10, govt/aided school", deadline: "October 31", applicationUrl: "https://scholarships.gov.in", category: "ST" },
        { title: "Pre-Matric Scholarship – OBC", provider: "Ministry of Social Justice", amount: "₹1,500–₹5,500/year", eligibility: "OBC category, Class 9–10, income ≤ ₹1 lakh", deadline: "October 31", applicationUrl: "https://scholarships.gov.in", category: "OBC" },
        { title: "Dr. Ambedkar Post-Matric Prep Grant (SC/OBC)", provider: "MoSJE", amount: "₹50,000 prep grant", eligibility: "SC/OBC clearing Class 10 with ≥ 55%, income ≤ ₹6 lakh", deadline: "August", applicationUrl: "https://socialjustice.gov.in", category: "SC/OBC" },
        { title: "Rajasthan Pre-Matric SC/ST/OBC", provider: "Rajasthan Govt.", amount: "₹8,000–₹15,000/year", eligibility: "SC/ST/OBC domicile of Rajasthan, Class 6–10", deadline: "November", applicationUrl: "https://sje.rajasthan.gov.in", category: "State Govt" },
      ],
      class12: [
        { title: "Post-Matric Scholarship – SC", provider: "Ministry of Social Justice", amount: "Tuition + ₹11,000–₹19,800 maintenance/year", eligibility: "SC category, Class 11–12, income ≤ ₹2.5 lakh", deadline: "October 31", applicationUrl: "https://scholarships.gov.in", category: "SC" },
        { title: "Post-Matric Scholarship – ST", provider: "Ministry of Tribal Affairs", amount: "Full tuition + ₹10,000–₹15,000 maintenance", eligibility: "ST category, any recognised institution post Class 10", deadline: "October 31", applicationUrl: "https://scholarships.gov.in", category: "ST" },
        { title: "Post-Matric Scholarship – OBC", provider: "State Social Welfare Depts.", amount: "₹5,000–₹11,000/year", eligibility: "OBC, Class 11–12, income ≤ ₹1 lakh", deadline: "October 31", applicationUrl: "https://scholarships.gov.in", category: "OBC" },
        { title: "Babu Jagjivan Ram Chhatrawas Yojana", provider: "MoSJE", amount: "Hostel accommodation grant", eligibility: "SC students in recognised institutions, income ≤ ₹3 lakh", deadline: "August", applicationUrl: "https://socialjustice.gov.in", category: "SC" },
        { title: "Nai Udaan – Minority Class 11–12", provider: "Ministry of Minority Affairs", amount: "₹25,000/year", eligibility: "Minority students clearing Class 10 prelims, income ≤ ₹2 lakh", deadline: "October 31", applicationUrl: "https://scholarships.gov.in", category: "Minority" },
      ],
      graduation: [
        { title: "National Fellowship & Scholarship – ST Higher Education", provider: "Ministry of Tribal Affairs", amount: "Full scholarship (UGC norms)", eligibility: "ST category, degree/PG enrolled, income ≤ ₹6 lakh", deadline: "October", applicationUrl: "https://scholarships.gov.in", category: "ST" },
        { title: "Dr. Ambedkar Post-Matric Scholarship – OBC/EBC", provider: "MoSJE", amount: "Tuition + maintenance allowance", eligibility: "OBC/EBC, UG/PG, income ≤ ₹1 lakh", deadline: "October 31", applicationUrl: "https://scholarships.gov.in", category: "OBC/EBC" },
        { title: "Rajiv Gandhi National Fellowship – SC/ST", provider: "UGC", amount: "₹25,000–₹28,000/month (JRF/SRF)", eligibility: "SC/ST, MPhil/PhD, UGC-NET qualified", deadline: "April", applicationUrl: "https://www.ugc.gov.in", category: "SC/ST Research" },
        { title: "Maulana Azad National Fellowship (Minority)", provider: "Ministry of Minority Affairs", amount: "₹25,000–₹28,000/month", eligibility: "Minority community, MPhil/PhD, UGC-NET qualified", deadline: "March/April", applicationUrl: "https://maef.nic.in", category: "Minority" },
        { title: "Post-Matric Scholarship SC – Degree Level", provider: "Ministry of Social Justice", amount: "Full tuition + ₹19,800 maintenance/year", eligibility: "SC category, UG/PG degree, income ≤ ₹2.5 lakh", deadline: "October 31", applicationUrl: "https://scholarships.gov.in", category: "SC" },
      ],
    },
  };

  useEffect(() => {
    let currentList: any[] = [];
    
    const categoriesToCheck = category ? [category] : Object.keys(scholarshipData);
    
    categoriesToCheck.forEach(cat => {
      const classData = scholarshipData[cat];
      if (classData) {
        const classesToCheck = forClass ? [forClass] : Object.keys(classData);
        classesToCheck.forEach(cls => {
          if (classData[cls]) {
            currentList = [...currentList, ...classData[cls]];
          }
        });
      }
    });

    setList(currentList);
    setLoading(false);
  }, [category, forClass]);

  const content = (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Scholarships for Rural Students</h1>
          <p className="text-muted-foreground">
            Find merit-based, need-based and category-wise scholarships. Check eligibility and deadlines before applying.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="merit">Merit</SelectItem>
                <SelectItem value="need">Need-based</SelectItem>
                <SelectItem value="caste">Caste / Category</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Class / Level</Label>
            <Select value={forClass || "all"} onValueChange={(v) => setForClass(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="class10">Class 10</SelectItem>
                <SelectItem value="class12">Class 12</SelectItem>
                <SelectItem value="graduation">Graduation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No scholarships match your filters. Try changing filters or check back later.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map((s, idx) => (
              <Card key={`${s.title}-${idx}`} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <Award className="h-8 w-8 text-primary shrink-0" />
                    {s.category && <Badge variant="secondary">{s.category}</Badge>}
                  </div>
                  <CardTitle className="text-lg">{s.title}</CardTitle>
                  {s.provider && <CardDescription>{s.provider}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  {s.amount && <p className="text-sm font-medium text-primary">{s.amount}</p>}
                  {s.eligibility && <p className="text-sm text-muted-foreground line-clamp-2">{s.eligibility}</p>}
                  {s.deadline && (
                    <p className="text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Deadline: {s.deadline}
                    </p>
                  )}
                  <div className="pt-2 flex flex-wrap gap-2">
                    {s.applicationUrl && (
                      <a href={s.applicationUrl.startsWith("http") ? s.applicationUrl : `https://${s.applicationUrl}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="default" size="sm" className="gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Official Website / Apply
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  );

  if (embedded) return content;
  return <AppLayout>{content}</AppLayout>;
}
