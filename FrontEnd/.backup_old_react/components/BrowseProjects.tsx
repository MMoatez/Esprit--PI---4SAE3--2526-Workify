import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Search, Filter, DollarSign, Clock, Star, TrendingUp, MapPin } from 'lucide-react';
import { projects, categories, type Project } from '@/app/data/mockData';

export default function BrowseProjects() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [budgetRange, setBudgetRange] = useState<[number, number]>([0, 20000]);
  const [sortBy, setSortBy] = useState<'recent' | 'budget' | 'proposals'>('recent');

  // Calculate match scores for projects
  const projectsWithScores = useMemo(() => {
    return projects.map((project) => ({
      ...project,
      matchScore: Math.floor(Math.random() * 30) + 70, // 70-99 range
    }));
  }, []);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let filtered = projectsWithScores.filter((project) => {
      const matchesSearch =
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.skills.some((skill) =>
          skill.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesCategory =
        selectedCategory === 'All Categories' || project.category === selectedCategory;

      const matchesBudget =
        project.budget.max >= budgetRange[0] && project.budget.min <= budgetRange[1];

      return matchesSearch && matchesCategory && matchesBudget;
    });

    // Sort projects
    if (sortBy === 'budget') {
      filtered.sort((a, b) => b.budget.max - a.budget.max);
    } else if (sortBy === 'proposals') {
      filtered.sort((a, b) => a.proposals - b.proposals);
    } else {
      filtered.sort(
        (a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
      );
    }

    return filtered;
  }, [projectsWithScores, searchTerm, selectedCategory, budgetRange, sortBy]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Browse Projects</h1>
          <p className="text-slate-600">
            Discover opportunities that match your skills and expertise
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="size-5 text-slate-600" />
                <h2 className="font-semibold text-slate-900">Filters</h2>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Category
                </label>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === category
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Budget Range
                </label>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="0"
                    max="20000"
                    step="1000"
                    value={budgetRange[1]}
                    onChange={(e) => setBudgetRange([budgetRange[0], parseInt(e.target.value)])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>${budgetRange[0].toLocaleString()}</span>
                    <span>${budgetRange[1].toLocaleString()}+</span>
                  </div>
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'budget' | 'proposals')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="recent">Most Recent</option>
                  <option value="budget">Highest Budget</option>
                  <option value="proposals">Fewest Proposals</option>
                </select>
              </div>
            </div>
          </div>

          {/* Projects List */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search projects by title, description, or skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4">
              <p className="text-slate-600">
                {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {/* Project Cards */}
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="block bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                          {project.title}
                        </h3>
                        {project.matchScore && project.matchScore >= 85 && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                            {project.matchScore}% Match
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 mb-4">{project.description}</p>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      {/* Project Meta */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="size-4" />
                          <span>
                            ${project.budget.min.toLocaleString()} - $
                            {project.budget.max.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="size-4" />
                          <span>{project.duration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="size-4" />
                          <span>{project.proposals} proposals</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="size-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {project.client.name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{project.client.name}</div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Star className="size-3 fill-yellow-400 text-yellow-400" />
                            <span>{project.client.rating}</span>
                          </div>
                          <span>•</span>
                          <span>{project.client.projectsPosted} projects posted</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-slate-500">{formatDate(project.postedDate)}</div>
                  </div>
                </Link>
              ))}

              {filteredProjects.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <Search className="size-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No projects found</h3>
                  <p className="text-slate-600">
                    Try adjusting your filters or search terms to find more projects.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
