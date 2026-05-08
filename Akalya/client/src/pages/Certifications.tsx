import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Award, ExternalLink } from "lucide-react";

export default function Certifications({ embedded }: { embedded?: boolean }) {
  const [levelFilter, setLevelFilter] = useState<string>("after12th");
  const [domainFilter, setDomainFilter] = useState<string>("all");

  const certificationData: Record<string, { title: string; provider: string; domain: string; description: string; link: string; type: string }[]> = {
    after10th: [
      {
        title: "PMKVY Short Term Training",
        provider: "Government of India (Skill India)",
        domain: "Vocational",
        type: "Free / Govt",
        description: "Pradhan Mantri Kaushal Vikas Yojana offers short-term skill training in multiple sectors like Electronics, Beauty, and Retail.",
        link: "https://www.pmkvyofficial.org"
      },
      {
        title: "ITI & NCVT Certificates",
        provider: "State Technical Boards",
        domain: "Vocational",
        type: "Diploma / Govt",
        description: "Industrial Training Institutes provide core trade certifications (Electrician, Fitter, Welder) highly valued for govt and private jobs.",
        link: "https://ncvt.nic.in"
      },
      {
        title: "Course on Computer Concepts (CCC)",
        provider: "NIELIT (Govt of India)",
        domain: "IT & Software",
        type: "Govt Certificate",
        description: "A foundational digital literacy course widely required for various state and central government clerical jobs.",
        link: "https://student.nielit.gov.in"
      },
      {
        title: "Google IT Support Professional",
        provider: "Google (via Coursera)",
        domain: "IT & Software",
        type: "Professional",
        description: "Learn the fundamentals of IT support, networking, and security. Great starting point for a tech career without a degree.",
        link: "https://grow.google/certificates/it-support"
      },
      {
        title: "Basic Digital Marketing",
        provider: "Google Digital Garage",
        domain: "Business & Marketing",
        type: "Free / Professional",
        description: "Learn the basics of digital marketing, SEO, and online presence. Includes a free certification from Google.",
        link: "https://skillshop.exceedlms.com/student/catalog/list?category_ids=7234"
      }
    ],
    after12th: [
      {
        title: "NPTEL / SWAYAM Online Courses",
        provider: "IITs & Ministry of Education",
        domain: "Academic & Tech",
        type: "Free / Govt",
        description: "High-quality engineering, science, and humanities courses taught by IIT professors with proctored exam certification.",
        link: "https://swayam.gov.in"
      },
      {
        title: "CS50: Introduction to Computer Science",
        provider: "Harvard University (via edX)",
        domain: "IT & Software",
        type: "Academic",
        description: "One of the most famous computer science courses in the world. Teaches C, Python, SQL, and web development fundamentals.",
        link: "https://cs50.harvard.edu/x"
      },
      {
        title: "AWS Certified Cloud Practitioner",
        provider: "Amazon Web Services",
        domain: "IT & Software",
        type: "Professional",
        description: "Entry-level cloud certification validating overall understanding of the AWS Cloud platform and security.",
        link: "https://aws.amazon.com/certification/certified-cloud-practitioner"
      },
      {
        title: "TallyPrime Certification",
        provider: "Tally Education",
        domain: "Business & Accounting",
        type: "Professional",
        description: "Industry-standard certification for accounting, GST filing, and inventory management. Essential for commerce students.",
        link: "https://tallyeducation.com"
      },
      {
        title: "Data Analytics Professional Certificate",
        provider: "Google / IBM (via Coursera)",
        domain: "Data & Tech",
        type: "Professional",
        description: "Learn data cleaning, visualization, and SQL. A fantastic bridge into the high-paying data science sector.",
        link: "https://grow.google/certificates/data-analytics"
      },
      {
        title: "NSE Certification in Financial Markets (NCFM)",
        provider: "National Stock Exchange",
        domain: "Finance & Commerce",
        type: "Professional",
        description: "Foundational knowledge in stock markets, mutual funds, and trading. Excellent for students wanting a career in finance.",
        link: "https://www.nseindia.com/education/about-ncfm"
      }
    ]
  };

  const getFilteredCerts = () => {
    let list = certificationData[levelFilter] || [];
    if (domainFilter !== "all") {
      list = list.filter(c => c.domain.toLowerCase() === domainFilter.toLowerCase());
    }
    return list;
  };

  const list = getFilteredCerts();

  const content = (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Government & Professional Certifications</h1>
        <p className="text-muted-foreground">
          Build your skills independently with official government, university, and industry-recognised certifications.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Education Level</label>
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
          <label className="text-sm font-medium leading-none">Domain / Field</label>
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              <SelectItem value="vocational">Vocational / Trades</SelectItem>
              <SelectItem value="it & software">IT & Software</SelectItem>
              <SelectItem value="business & marketing">Business & Marketing</SelectItem>
              <SelectItem value="business & accounting">Accounting & Finance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No certifications match your filters. Try changing filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((cert, idx) => (
            <Card key={`${cert.title}-${idx}`} className="hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Award className="h-6 w-6 text-primary" />
                  <Badge variant="secondary">{cert.type}</Badge>
                </div>
                <CardTitle className="text-lg leading-tight">{cert.title}</CardTitle>
                <CardDescription className="text-primary font-medium">{cert.provider}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                <p className="text-sm text-muted-foreground flex-1">{cert.description}</p>
                <div className="mt-auto">
                  <a href={cert.link} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      Official Website / Enroll <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8 bg-muted/30">
        <CardHeader>
          <CardTitle>Looking for competitive exams instead?</CardTitle>
          <CardDescription>
            If you are preparing for government jobs (SSC, Banking, Railway) or college admissions, check our Entrance Exams section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/dashboard/student/career-gateway/entrance-exams">
            <Button variant="default">View Entrance Exams</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );

  if (embedded) return content;
  return <AppLayout>{content}</AppLayout>;
}
