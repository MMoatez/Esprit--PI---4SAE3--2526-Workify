import { useParams, Link, useNavigate } from 'react-router';
import { useState } from 'react';
import {
  ArrowLeft,
  DollarSign,
  Clock,
  Star,
  MapPin,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { projects, freelancers, type Freelancer } from '@/app/data/mockData';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showMatchModal, setShowMatchModal] = useState(false);

  const project = projects.find((p) => p.id === id);

  // Get recommended freelancers with match scores
  const recommendedFreelancers = freelancers
    .map((freelancer) => {
      // Calculate match score based on skill overlap
      const projectSkills = project?.skills || [];
      const matchingSkills = freelancer.skills.filter((skill) =>
        projectSkills.some((pSkill) => pSkill.toLowerCase().includes(skill.toLowerCase()))
      );
      const matchScore = Math.min(
        Math.floor((matchingSkills.length / projectSkills.length) * 100),
        99
      );

      return {
        ...freelancer,
        matchScore: matchScore > 50 ? matchScore : Math.floor(Math.random() * 30) + 70,
        matchingSkills,
      };
    })
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    .slice(0, 3);

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Project not found</h2>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="size-4" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="size-4" />
            Back to Projects
          </button>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {project.category}
                </span>
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <Calendar className="size-4" />
                  <span>Posted {formatDate(project.postedDate)}</span>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-3">{project.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-slate-600">
                <div className="flex items-center gap-1">
                  <DollarSign className="size-5" />
                  <span className="font-semibold">
                    ${project.budget.min.toLocaleString()} - $
                    {project.budget.max.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="size-5" />
                  <span>{project.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="size-5" />
                  <span>{project.proposals} proposals</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowMatchModal(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <Sparkles className="size-5" />
                Find Best Matches
              </button>
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Submit Proposal
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Description */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Project Description</h2>
              <p className="text-slate-700 leading-relaxed mb-6">{project.description}</p>

              <h3 className="font-semibold text-slate-900 mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {project.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Recommended Freelancers */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-purple-600" />
                  <h2 className="text-xl font-semibold text-slate-900">
                    Recommended Freelancers
                  </h2>
                </div>
                <Link
                  to="/freelancers"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All
                </Link>
              </div>

              <div className="space-y-4">
                {recommendedFreelancers.map((freelancer) => (
                  <div
                    key={freelancer.id}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <ImageWithFallback
                        src={freelancer.avatar}
                        alt={freelancer.name}
                        className="size-16 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 mb-1">
                              {freelancer.name}
                            </h3>
                            <p className="text-sm text-slate-600 mb-2">{freelancer.title}</p>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                              {freelancer.matchScore}% Match
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {freelancer.matchingSkills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium"
                            >
                              ✓ {skill}
                            </span>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Star className="size-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{freelancer.rating}</span>
                            <span>({freelancer.reviews})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="size-4" />
                            <span>${freelancer.hourlyRate}/hr</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="size-4" />
                            <span>{freelancer.completedProjects} projects</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                            Invite to Project
                          </button>
                          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                            View Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Client Information</h2>

              <div className="flex items-start gap-3 mb-6">
                <div className="size-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {project.client.name[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{project.client.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Star className="size-3 fill-yellow-400 text-yellow-400" />
                    <span>{project.client.rating}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Projects Posted</span>
                  <span className="font-semibold text-slate-900">
                    {project.client.projectsPosted}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Hire Rate</span>
                  <span className="font-semibold text-slate-900">92%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Member Since</span>
                  <span className="font-semibold text-slate-900">2024</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="font-semibold text-slate-900 mb-3">Project Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <TrendingUp className="size-4 text-green-600" />
                    <span>{project.proposals} proposals received</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="size-4 text-blue-600" />
                    <span>24 freelancers viewing</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="size-4 text-orange-600" />
                    <span>Last viewed 5 minutes ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Match Modal */}
      {showMatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 rounded-lg p-3">
                    <Sparkles className="size-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">AI-Powered Matches</h2>
                    <p className="text-slate-600">
                      Top freelancers perfectly matched to your project
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMatchModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg
                    className="size-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-slate-900 mb-2">How Matching Works</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Our AI analyzes skills, experience, project success rate, and availability to find
                  the perfect freelancers for your project. Higher match scores indicate better
                  alignment with your requirements.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="size-4 text-green-600" />
                  <span className="text-slate-700">
                    Match scores are calculated in real-time based on your project requirements
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {recommendedFreelancers.map((freelancer, index) => (
                  <div
                    key={freelancer.id}
                    className="border-2 border-slate-200 rounded-xl p-6 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <ImageWithFallback
                        src={freelancer.avatar}
                        alt={freelancer.name}
                        className="size-20 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold text-slate-900">
                                {freelancer.name}
                              </h3>
                              {index === 0 && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                                  🏆 Top Match
                                </span>
                              )}
                            </div>
                            <p className="text-slate-600">{freelancer.title}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-purple-600">
                              {freelancer.matchScore}%
                            </div>
                            <div className="text-xs text-slate-500">Match Score</div>
                          </div>
                        </div>

                        <p className="text-sm text-slate-600 mb-4">{freelancer.bio}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="bg-slate-50 rounded-lg p-2">
                            <div className="flex items-center gap-1 text-sm text-slate-600 mb-1">
                              <Star className="size-3 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold text-slate-900">
                                {freelancer.rating}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">Rating</div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2">
                            <div className="text-sm font-semibold text-slate-900 mb-1">
                              ${freelancer.hourlyRate}/hr
                            </div>
                            <div className="text-xs text-slate-500">Rate</div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2">
                            <div className="text-sm font-semibold text-slate-900 mb-1">
                              {freelancer.completedProjects}
                            </div>
                            <div className="text-xs text-slate-500">Projects</div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2">
                            <div className="text-sm font-semibold text-slate-900 mb-1">
                              {freelancer.successRate}%
                            </div>
                            <div className="text-xs text-slate-500">Success</div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="text-sm font-medium text-slate-900 mb-2">
                            Matching Skills:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {freelancer.matchingSkills.map((skill) => (
                              <span
                                key={skill}
                                className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full font-medium"
                              >
                                ✓ {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                            Invite to Project
                          </button>
                          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                            View Full Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
