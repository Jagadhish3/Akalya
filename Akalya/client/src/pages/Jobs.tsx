import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { jobsAPI } from "@/lib/api";
import { Briefcase, ExternalLink } from "lucide-react";

export default function Jobs({ embedded, defaultTab }: { embedded?: boolean; defaultTab?: "10th" | "12th" }) {
  const tab = defaultTab || "10th";

  const jobsData = {
    govt10: [
      { title: "SSC MTS (Multi Tasking Staff)", description: "General central service group 'C' non-gazetted, non-ministerial post.", eligibility: "Class 10th Pass", ageLimit: "18-25 Years", salaryRange: "₹18,000 - ₹22,000 / month", selectionProcess: "Written Exam (CBT)", officialWebsite: "https://ssc.nic.in" },
      { title: "Indian Army Soldier GD", description: "General Duty Soldier in the Indian Army.", eligibility: "Class 10th with 45% marks", ageLimit: "17.5 - 21 Years", salaryRange: "₹30,000+ / month", selectionProcess: "Physical Test, Medical, Written", officialWebsite: "https://joinindianarmy.nic.in" },
      { title: "India Post GDS (Gramin Dak Sevak)", description: "Branch Postmaster, Assistant Branch Postmaster, and Dak Sevak.", eligibility: "Class 10th with passing marks in Math/English", ageLimit: "18-40 Years", salaryRange: "₹10,000 - ₹29,380 / month", selectionProcess: "Merit based on 10th Marks", officialWebsite: "https://indiapostgdsonline.gov.in" }
    ],
    skill10: [
      { title: "NCVT ITI Trades (Electrician/Fitter)", description: "Core technical trades with high demand in manufacturing and govt sectors.", eligibility: "Class 10th Pass", ageLimit: "14-40 Years", salaryRange: "₹12,000 - ₹25,000 / month", selectionProcess: "Merit / Entrance", officialWebsite: "https://ncvt.nic.in" },
      { title: "Data Entry Operator (Skill India)", description: "NSDC certified data entry jobs for various clerical tasks.", eligibility: "Class 10th + Basic Computer Skills", ageLimit: "18+ Years", salaryRange: "₹10,000 - ₹18,000 / month", selectionProcess: "Skill Test", officialWebsite: "https://skillindia.gov.in" },
      { title: "Plumber / Welder", description: "Highly demanded vocational skills in construction and real estate.", eligibility: "Class 8th / 10th Pass", ageLimit: "No specific limit", salaryRange: "₹15,000 - ₹30,000 / month", selectionProcess: "Direct Hiring / Agency", officialWebsite: "https://www.pmkvyofficial.org" }
    ],
    govt12: [
      { title: "SSC CHSL (LDC/JSA/DEO)", description: "Combined Higher Secondary Level for various clerical govt posts.", eligibility: "Class 12th Pass", ageLimit: "18-27 Years", salaryRange: "₹25,000 - ₹35,000 / month", selectionProcess: "Tier I & II CBT, Skill Test", officialWebsite: "https://ssc.nic.in" },
      { title: "NDA (National Defence Academy)", description: "Entry to Army, Navy, and Air Force as an Officer.", eligibility: "Class 12th (PCM for Navy/AF)", ageLimit: "16.5 - 19.5 Years", salaryRange: "Stipend ₹56,100 / month", selectionProcess: "Written Exam + SSB Interview", officialWebsite: "https://upsc.gov.in" },
      { title: "RRB NTPC (Undergraduate Posts)", description: "Commercial cum Ticket Clerk, Accounts Clerk, Junior Clerk.", eligibility: "Class 12th Pass", ageLimit: "18-30 Years", salaryRange: "₹19,900 - ₹21,700 (Basic)", selectionProcess: "CBT 1, CBT 2, Typing Test", officialWebsite: "https://indianrailways.gov.in" },
      { title: "State Police Constable", description: "General duty constable in state police departments.", eligibility: "Class 12th Pass", ageLimit: "18-25 Years (varies by state)", salaryRange: "₹21,700 - ₹69,100", selectionProcess: "Physical, Written Exam, Medical", officialWebsite: "https://ssc.nic.in" }
    ],
    private12: [
      { title: "Customer Support Executive (BPO)", description: "Voice and non-voice process roles in IT/BPO sectors.", eligibility: "Class 12th + Good Communication", ageLimit: "18+ Years", salaryRange: "₹15,000 - ₹25,000 / month", selectionProcess: "Interview & Language Test", officialWebsite: "https://www.naukri.com" },
      { title: "Retail Sales Associate", description: "Sales roles in malls, supermarkets, and brand outlets.", eligibility: "Class 12th", ageLimit: "18+ Years", salaryRange: "₹12,000 - ₹20,000 / month", selectionProcess: "Walk-in Interview", officialWebsite: "https://www.apna.co" },
      { title: "Digital Marketing Executive", description: "Entry-level roles for social media handling and content posting.", eligibility: "Class 12th + Basic Digital Skills", ageLimit: "18+ Years", salaryRange: "₹15,000 - ₹22,000 / month", selectionProcess: "Interview & Portfolio", officialWebsite: "https://in.indeed.com" }
    ]
  };

  const JobCard = ({ j }: { j: any }) => (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <Briefcase className="h-6 w-6 text-primary mb-1" />
        <CardTitle className="text-lg leading-tight">{j.title}</CardTitle>
        <CardDescription className="line-clamp-2">{j.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-2 text-sm">
        <div className="flex-1 space-y-2">
          {j.eligibility && <p><span className="font-medium text-foreground">Eligibility:</span> <span className="text-muted-foreground">{j.eligibility}</span></p>}
          {j.ageLimit && <p><span className="font-medium text-foreground">Age:</span> <span className="text-muted-foreground">{j.ageLimit}</span></p>}
          {j.salaryRange && <p><span className="font-medium text-foreground">Salary:</span> <span className="text-primary font-medium">{j.salaryRange}</span></p>}
          {j.selectionProcess && <p><span className="font-medium text-foreground">Selection:</span> <span className="text-muted-foreground">{j.selectionProcess}</span></p>}
        </div>
        <div className="mt-4 pt-2">
          {j.officialWebsite && (
            <a href={j.officialWebsite} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="w-full gap-2">
                Apply / Official Link <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const content = (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {tab === "10th" ? "Jobs After 10th" : "Jobs After 12th"}
        </h1>
        <p className="text-muted-foreground">
          {tab === "10th" 
            ? "Explore government and skill-based career opportunities available immediately after passing Class 10."
            : "Explore government, defense, and private sector job opportunities available after passing Class 12."}
        </p>
      </div>

      {tab === "10th" && (
        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Government Jobs After 10th</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobsData.govt10.map((j, idx) => <JobCard key={`govt10-${idx}`} j={j} />)}
            </div>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Skill-Based & Vocational Jobs</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobsData.skill10.map((j, idx) => <JobCard key={`skill10-${idx}`} j={j} />)}
            </div>
          </section>
        </div>
      )}

      {tab === "12th" && (
        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Government & Defence Jobs</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobsData.govt12.map((j, idx) => <JobCard key={`govt12-${idx}`} j={j} />)}
            </div>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Private Sector Opportunities</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobsData.private12.map((j, idx) => <JobCard key={`private12-${idx}`} j={j} />)}
            </div>
          </section>
        </div>
      )}
    </div>
  );

  if (embedded) return content;
  return <AppLayout>{content}</AppLayout>;
}
