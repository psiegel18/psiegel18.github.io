export default function RoadtripsPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          <i className="fas fa-map-marked-alt text-purple-400 mr-3" />
          My Roadtrips
        </h1>

        <div className="card p-4 aspect-video">
          <iframe
            src="https://travelmapping.net/user/?units=miles&u=psiegel18"
            className="w-full h-full rounded-lg"
            title="Travel Mapping - psiegel18"
            allowFullScreen
          />
        </div>

        <div className="text-center mt-6">
          <a
            href="https://travelmapping.net/user/?units=miles&u=psiegel18"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            <i className="fas fa-external-link-alt mr-2" />
            Open in New Tab
          </a>
        </div>
      </div>
    </div>
  )
}
