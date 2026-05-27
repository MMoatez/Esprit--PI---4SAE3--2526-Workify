import { useState, useMemo } from 'react';
import { Search, Filter, Star, MapPin, Clock, CheckCircle, TrendingUp, DollarSign } from 'lucide-react';
import { freelancers, categories, type Freelancer } from '@/app/data/mockData';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

export default function FreelancerProfiles() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [rateRange, setRateRange] = useState<[number, number]>([0, 150]);
  const [sortBy, setSortBy] = useState<'match' | 'rating' | 'rate'>('match');

  // Calculate match scores for freelancers
  const freelancersWithScores = useMemo(() => {
    return freelancers.map((freelancer) => ({
      ...freelancer,
      matchScore: Math.floor(Math.random() * 30) + 70, // 70-99 range
    }));
  }, []);

  // Filter and sort freelancers
  const filteredFreelancers = useMemo(() => {
    let filtered = freelancersWithScores.filter((freelancer) => {
      const matchesSearch =
        freelancer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        freelancer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        freelancer.bio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        freelancer.skills.some((skill) =>
          skill.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesCategory =
        selectedCategory === 'All Categories' ||
        freelancer.title.toLowerCase().includes(selectedCategory.toLowerCase());

      const matchesRate =
        freelancer.hourlyRate >= rateRange[0] && freelancer.hourlyRate <= rateRange[1];

      return matchesSearch && matchesCategory && matchesRate;
    });

    // Sort freelancers
    if (sortBy === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'rate') {
      filtered.sort((a, b) => a.hourlyRate - b.hourlyRate);
    } else {
      filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    return filtered;
  }, [freelancersWithScores, searchTerm, selectedCategory, rateRange, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Find Freelancers</h1>
          <p className="text-slate-600">
            Connect with talented professionals for your next project
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
                  Specialization
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

              {/* Hourly Rate */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Hourly Rate
                </label>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="10"
                    value={rateRange[1]}
                    onChange={(e) => setRateRange([rateRange[0], parseInt(e.target.value)])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>${rateRange[0]}/hr</span>
                    <span>${rateRange[1]}/hr+</span>
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
                  onChange={(e) => setSortBy(e.target.value as 'match' | 'rating' | 'rate')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="match">Best Match</option>
                  <option value="rating">Highest Rated</option>
                  <option value="rate">Lowest Rate</option>
                </select>
              </div>
            </div>
          </div>

          {/* Freelancers Grid */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, skills, or expertise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4">
              <p className="text-slate-600">
                {filteredFreelancers.length} freelancer{filteredFreelancers.length !== 1 ? 's' : ''}{' '}
                found
              </p>
            </div>

            {/* Freelancer Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredFreelancers.map((freelancer) => (
                <div
                  key={freelancer.id}
                  className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Header with Avatar and Match Score */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <ImageWithFallback
                        src={freelancer.avatar}
                        alt={freelancer.name}
                        className="size-16 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">
                          {freelancer.name}
                        </h3>
                        <p className="text-slate-600 text-sm">{freelancer.title}</p>
                      </div>
                    </div>
                    {freelancer.matchScore && freelancer.matchScore >= 85 && (
                      <div className="flex flex-col items-center">
                        <div className="size-14 rounded-full border-4 border-green-500 flex items-center justify-center">
                          <span className="text-lg font-bold text-green-600">
                            {freelancer.matchScore}
                          </span>
                        </div>
                        <span className="text-xs text-green-600 mt-1">Match</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-1 text-slate-600 text-sm mb-1">
                        <Star className="size-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-slate-900">{freelancer.rating}</span>
                        <span>({freelancer.reviews})</span>
                      </div>
                      <div className="text-xs text-slate-500">Rating</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-slate-600 text-sm mb-1">
                        <DollarSign className="size-4" />
                        <span className="font-semibold text-slate-900">
                          ${freelancer.hourlyRate}/hr
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">Hourly Rate</div>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-slate-600 mb-4">{freelancer.bio}</p>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {freelancer.skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                    {freelancer.skills.length > 4 && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                        +{freelancer.skills.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mb-4">
                    <div className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      <span>{freelancer.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      <span>{freelancer.responseTime}</span>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="font-semibold text-slate-900 text-sm">
                        {freelancer.completedProjects}
                      </div>
                      <div className="text-xs text-slate-600">Projects</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="font-semibold text-slate-900 text-sm">
                        {freelancer.successRate}%
                      </div>
                      <div className="text-xs text-slate-600">Success</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="size-3 text-green-600" />
                        <span className="font-semibold text-slate-900 text-sm">Top</span>
                      </div>
                      <div className="text-xs text-slate-600">Rated</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                      Hire Now
                    </button>
                    <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                      View Profile
                    </button>
                  </div>
                </div>
              ))}

              {filteredFreelancers.length === 0 && (
                <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <Search className="size-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    No freelancers found
                  </h3>
                  <p className="text-slate-600">
                    Try adjusting your filters or search terms to find more freelancers.
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
