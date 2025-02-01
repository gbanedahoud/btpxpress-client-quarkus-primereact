import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import btpXpressLogo from '../assets/btpxpress-logo.png';
import lionsDevLogo from '../assets/logolionsdev.png';
import {
    AlertTriangle,
    Bookmark,
    ChevronRight,
    ChevronLeft,
    Building2,
    Calendar,
    Camera,
    Check,
    ChevronDown,
    Clock,
    Download,
    FileText,
    Heart,
    HardHat,
    Image,
    Info,
    Loader2,
    Mail,
    MapPin,
    MessageCircle,
    MessageSquare,
    Phone,
    Share2,
    ShieldCheck,
    Star,
    Send,
    Search,    // Ajout de Search ici
    SearchX,
    Truck,
    Wrench,
    Upload,
    UserCircle,
    Users,
    X, Facebook, Twitter, Linkedin, Instagram, Award
} from 'lucide-react';

// Constantes de configuration
const CONFIG = {
    animationDuration: 300,
    maxUploadSize: 5 * 1024 * 1024, // 5MB
    dateFormat: 'dd/MM/yyyy',
    defaultCurrency: 'F Cfa',
    apiEndpoint: 'https://api.btpxpress.lions.dev',
    mapZoom: 12,
    imageQuality: 0.8,
    maxGalleryItems: 12,
    chatRefreshRate: 30000, // 30 secondes
    cacheTimeout: 3600000 // 1 heure
};

// Ajoutez cette constante avec les autres constantes de configuration
const SERVICES = [
    {
        id: 1,
        icon: Building2,
        title: "Location d'Équipements",
        url: '#equipements'
    },
    {
        id: 2,
        icon: Wrench,
        title: "Maintenance",
        url: '#maintenance'
    },
    {
        id: 3,
        icon: ShieldCheck,
        title: "Certification",
        url: '#certification'
    },
    {
        id: 4,
        icon: Users,
        title: "Formation",
        url: '#formation'
    }
];

// Hook personnalisé pour la gestion du cache local
const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            const parsed = item ? JSON.parse(item) : initialValue;

            // Vérification de l'expiration
            if (parsed.timestamp && Date.now() - parsed.timestamp > CONFIG.cacheTimeout) {
                window.localStorage.removeItem(key);
                return initialValue;
            }
            return parsed.value || initialValue;
        } catch (error) {
            console.warn('Erreur lors de la lecture du cache:', error);
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            setStoredValue(value);
            window.localStorage.setItem(key, JSON.stringify({
                value,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Erreur lors de l\'écriture dans le cache:', error);
        }
    }, [key]);

    return [storedValue, setValue];
};

const useDebouncedCallback = (callback, delay) => {
    const timeoutRef = useRef();

    const debouncedCallback = useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debouncedCallback;
};

// Hook personnalisé pour la détection du mode hors ligne
const useOfflineDetection = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOffline;
};

// Hook personnalisé pour la gestion de l'observation de la visibilité
const useIntersectionObserver = (options = {}) => {
    const targetRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hasBeenVisible, setHasBeenVisible] = useState(false);

    const callback = useCallback((entries) => {
        const [entry] = entries;
        setIsVisible(entry.isIntersecting);

        if (entry.isIntersecting && !hasBeenVisible) {
            setHasBeenVisible(true);
        }
    }, [hasBeenVisible]);

    useEffect(() => {
        const observer = new IntersectionObserver(callback, {
            root: options.root || null,
            rootMargin: options.rootMargin || '0px',
            threshold: options.threshold || 0,
        });

        const currentTarget = targetRef.current;

        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [callback, options.root, options.rootMargin, options.threshold]);

    return [targetRef, isVisible, hasBeenVisible];
};

const useApi = (url, options = {}) => {
    const {
        initialData = null,
        cacheTime = 5 * 60 * 1000, // 5 minutes par défaut
        retryCount = 3,
        retryDelay = 1000,
        dependencies = [],
        autoFetch = true
    } = options;

    const [data, setData] = useState(initialData);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [retryAttempt, setRetryAttempt] = useState(0);

    const cacheRef = useRef({});
    const controllerRef = useRef(null);

    const getCacheKey = useCallback(() => {
        return `${url}-${JSON.stringify(options.params || {})}`;
    }, [url, options.params]);

    const checkCache = useCallback(() => {
        const key = getCacheKey();
        const cachedData = cacheRef.current[key];

        if (cachedData && Date.now() - cachedData.timestamp < cacheTime) {
            return cachedData.data;
        }

        return null;
    }, [getCacheKey, cacheTime]);

    const updateCache = useCallback((newData) => {
        const key = getCacheKey();
        cacheRef.current[key] = {
            data: newData,
            timestamp: Date.now()
        };
    }, [getCacheKey]);

    const fetchData = useCallback(async (signal) => {
        setIsLoading(true);
        setError(null);

        try {
            const cachedData = checkCache();
            if (cachedData) {
                setData(cachedData);
                setIsLoading(false);
                return;
            }

            const response = await fetch(url, {
                ...options,
                signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            setData(result);
            updateCache(result);
            setRetryAttempt(0);

        } catch (err) {
            if (err.name === 'AbortError') {
                return;
            }

            setError(err);

            if (retryAttempt < retryCount) {
                setTimeout(() => {
                    setRetryAttempt(prev => prev + 1);
                }, retryDelay * Math.pow(2, retryAttempt));
            }
        } finally {
            setIsLoading(false);
        }
    }, [url, options, checkCache, updateCache, retryAttempt, retryCount, retryDelay]);

    const refetch = useCallback(() => {
        if (controllerRef.current) {
            controllerRef.current.abort();
        }

        controllerRef.current = new AbortController();
        return fetchData(controllerRef.current.signal);
    }, [fetchData]);

    const invalidateCache = useCallback(() => {
        const key = getCacheKey();
        delete cacheRef.current[key];
    }, [getCacheKey]);

    useEffect(() => {
        if (!autoFetch) return;

        refetch();

        return () => {
            if (controllerRef.current) {
                controllerRef.current.abort();
            }
        };
    }, [refetch, autoFetch, ...dependencies]);

    const mutate = useCallback((newData) => {
        setData(newData);
        updateCache(newData);
    }, [updateCache]);

    return {
        data,
        error,
        isLoading,
        refetch,
        mutate,
        invalidateCache
    };
};

// Utilitaire pour formater les paramètres d'URL
const formatUrlParams = (baseUrl, params) => {
    if (!params) return baseUrl;

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            searchParams.append(key, value);
        }
    });

    const queryString = searchParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

// Composant de notification amélioré avec animations
const EnhancedNotification = memo(({title, type = 'info', content, duration = 5000, onClose}) => {
    const [isVisible, setIsVisible] = useState(true);
    const timeoutRef = useRef();

    useEffect(() => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Attendre la fin de l'animation
        }, duration);

        return () => clearTimeout(timeoutRef.current);
    }, [duration, onClose]);

    const getIcon = useCallback(() => {
        switch (type) {
            case 'success':
                return <Check className="w-5 h-5 text-green-500"/>;
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-yellow-500"/>;
            case 'error':
                return <X className="w-5 h-5 text-red-500"/>;
            default:
                return <Info className="w-5 h-5 text-blue-500"/>;
        }
    }, [type]);

    return (
        <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 transform
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4
                shadow-lg max-w-md">
                <div className="flex items-start gap-3">
                    {getIcon()}
                    <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white">{title}</h4>
                        <p className="text-slate-300 mt-1">{content}</p>
                    </div>
                    <button onClick={() => {
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                    }} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        </div>
    );
});

// Système de réservation avancé
const ReservationSystem = memo(() => {
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [duration, setDuration] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [availability, setAvailability] = useState({});

    const calculateTotal = useMemo(() => {
        if (!selectedEquipment || !duration) return 0;
        const basePrice = selectedEquipment.pricePerDay;
        let total = basePrice * duration;

        // Réductions par palier
        if (duration >= 30) total *= 0.8;  // -20% pour 30 jours ou plus
        else if (duration >= 7) total *= 0.9;  // -10% pour 7 jours ou plus

        return Math.round(total);
    }, [selectedEquipment, duration]);

    const handleReservation = async () => {
        setIsLoading(true);
        try {
            // Simulation d'une requête API
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Succès
            onNotification({
                type: 'success',
                title: 'Réservation confirmée',
                content: 'Nous vous contacterons rapidement pour finaliser les détails.'
            });
        } catch (error) {
            console.error('Erreur de réservation:', error);
            onNotification({
                type: 'error',
                title: 'Erreur de réservation',
                content: 'Veuillez réessayer ultérieurement.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-800/30 backdrop-blur-lg rounded-xl p-6 border border-slate-700">
            <h3 className="text-2xl font-semibold text-white mb-6">Réserver un équipement</h3>

            {/* Calendrier de sélection */}
            <div className="space-y-4 mb-6">
                <label className="block text-sm font-medium text-slate-300">
                    Date de début
                </label>
                <div className="grid grid-cols-7 gap-2">
                    {/* Logique du calendrier */}
                </div>
            </div>

            {/* Sélection d'équipement */}
            <div className="space-y-4 mb-6">
                <label className="block text-sm font-medium text-slate-300">
                    Équipement
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Liste des équipements disponibles */}
                </div>
            </div>

            {/* Durée de location */}
            <div className="space-y-4 mb-6">
                <label className="block text-sm font-medium text-slate-300">
                    Durée (jours)
                </label>
                <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value)))}
                    className="w-full rounded-lg bg-slate-700 border-slate-600 text-white px-4 py-2"
                />
            </div>

            {/* Résumé et total */}
            <div className="border-t border-slate-700 pt-4 mb-6">
                <div className="flex justify-between text-slate-300 mb-2">
                    <span>Sous-total</span>
                    <span>{calculateTotal.toLocaleString()} FCFA</span>
                </div>
                {duration >= 7 && (
                    <div className="text-green-400 text-sm mb-2">
                        Réduction appliquée: {duration >= 30 ? '20%' : '10%'}
                    </div>
                )}
            </div>

            {/* Bouton de réservation */}
            <button
                onClick={handleReservation}
                disabled={isLoading || !selectedDate || !selectedEquipment}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600
                    text-white rounded-lg py-3 px-4 flex items-center justify-center space-x-2
                    transition-colors duration-300"
            >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin"/>
                ) : (
                    <>
                        <Calendar className="w-5 h-5"/>
                        <span>Réserver maintenant</span>
                    </>
                )}
            </button>
        </div>
    );
});

// Galerie de projets interactive
const ProjectGallery = memo(() => {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const filteredProjects = useMemo(() => {
        return projects.filter(project => {
            if (filter === 'all') return true;
            return project.category === filter;
        });
    }, [projects, filter]);

    const loadMoreProjects = async () => {
        setIsLoading(true);
        try {
            // Simulation de chargement de données
            await new Promise(resolve => setTimeout(resolve, 1000));
            const newProjects = generateMockProjects(page);
            setProjects(prev => [...prev, ...newProjects]);
            setPage(prev => prev + 1);
        } catch (error) {
            console.error('Erreur de chargement des projets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMoreProjects();
    }, []);

    return (
        <section className="py-20 bg-gradient-to-b from-slate-900 to-blue-950">
            <div className="container mx-auto px-4">
                <h2 className="text-4xl font-bold text-white text-center mb-12">
                    Nos Réalisations
                </h2>

                {/* Filtres */}
                <div className="flex flex-wrap justify-center gap-4 mb-12">
                    {['all', 'construction', 'renovation', 'infrastructure'].map(category => (
                        <button
                            key={category}
                            onClick={() => setFilter(category)}
                            className={`px-6 py-2 rounded-full transition-all duration-300
                                ${filter === category
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                        >
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Grille de projets */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredProjects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => {
                                setSelectedProject(project);
                                setIsModalOpen(true);
                            }}
                            className="group relative overflow-hidden rounded-xl cursor-pointer"
                        >
                            <div className="aspect-w-16 aspect-h-9 bg-slate-800">
                                {/* Placeholder pour l'image */}
                                <div className="absolute inset-0 flex items-center justify-center
                                    bg-gradient-to-br from-blue-900/20 to-slate-900/20">
                                    <Camera className="w-12 h-12 text-white/30"/>
                                </div>
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="absolute bottom-0 left-0 right-0 p-6">
                                    <h3 className="text-xl font-semibold text-white mb-2">{project.title}</h3>
                                    <p className="text-slate-300 line-clamp-2">{project.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bouton "Charger plus" */}
                <div className="text-center mt-12">
                    <button
                        onClick={loadMoreProjects}
                        disabled={isLoading}
                        className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg
                            transition-colors duration-300 flex items-center justify-center space-x-2"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin"/>
                        ) : (
                            <>
                                <Download className="w-5 h-5"/>
                                <span>Charger plus de projets</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Modal de détail du projet */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={selectedProject?.title || ''}
                >
                    {selectedProject && (
                        <div className="space-y-6">
                            <div
                                className="aspect-w-16 aspect-h-9 bg-slate-800 rounded-lg overflow-hidden">
                                {/* Galerie d'images du projet */}
                                <div className="relative">
                                    {selectedProject.images?.map((image, index) => (
                                        <div
                                            key={index}
                                            className="absolute inset-0 flex items-center justify-center"
                                        >
                                            <Camera className="w-16 h-16 text-white/30"/>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-slate-300">{selectedProject.description}</p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-400">Client</h4>
                                        <p className="text-white">{selectedProject.client}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-400">Durée</h4>
                                        <p className="text-white">{selectedProject.duration}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-400">Localisation</h4>
                                        <p className="text-white">{selectedProject.location}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-400">Type</h4>
                                        <p className="text-white">{selectedProject.type}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-slate-400">Équipements
                                        utilisés</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProject.equipment?.map((item, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300"
                                            >
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-4">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                                >
                                    Fermer
                                </button>
                                <button
                                    onClick={() => {
                                        // Logique pour demander un devis similaire
                                    }}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                                        transition-colors duration-300 flex items-center space-x-2"
                                >
                                    <FileText className="w-4 h-4"/>
                                    <span>Demander un devis similaire</span>
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </section>
    );
});

// Système de chat en direct
const LiveChat = memo(() => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const isOffline = useOfflineDetection(); // Correction de la déstructuration

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }, []);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen, scrollToBottom]);

    const handleSendMessage = useCallback(async () => {
        if (!newMessage.trim()) return;

        const userMessage = {
            id: Date.now(),
            content: newMessage,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setNewMessage('');
        setIsTyping(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            const supportMessage = {
                id: Date.now() + 1,
                content: "Un agent va vous répondre dans quelques instants. Merci de votre patience.",
                sender: 'support',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, supportMessage]);
        } catch (error) {
            console.error('Erreur d\'envoi du message:', error);
        } finally {
            setIsTyping(false);
        }
    }, [newMessage]);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-4 right-4 z-40 p-4 rounded-full shadow-lg
                    transition-all duration-300 transform hover:scale-110
                    ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
                    ${isOffline ? 'bg-slate-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                <MessageCircle className="w-6 h-6 text-white"/>
            </button>

            <div className={`fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-slate-900
                rounded-lg shadow-xl border border-slate-700 transition-all duration-300 transform
                ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}
            >
                {/* En-tête */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <UserCircle className="w-8 h-8 text-slate-300"/>
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full
                                ${isOffline ? 'bg-slate-500' : 'bg-green-500'}`}/>
                        </div>
                        <div>
                            <h3 className="font-medium text-white">Support BTP Xpress</h3>
                            <p className="text-sm text-slate-400">
                                {isOffline ? 'Hors ligne' : 'En ligne'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                {/* Messages */}
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                    {messages.map(message => (
                        <div
                            key={message.id}
                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] rounded-lg p-3
                                ${message.sender === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300'}`}
                            >
                                <p>{message.content}</p>
                                <span className="text-xs opacity-75 mt-1 block">
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800 rounded-lg p-3 text-slate-300">
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"/>
                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"/>
                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"/>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef}/>
                </div>

                {/* Zone de saisie */}
                <div className="p-4 border-t border-slate-700">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Votre message..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2
                                text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700
                                text-white rounded-lg transition-colors duration-300"
                        >
                            <Send className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
});

// Section d'expertise technique
const TechnicalExpertise = memo(() => {
    const [ref, isVisible] = useIntersectionObserver({threshold: 0.2});
    const [activeTab, setActiveTab] = useState('equipment');

    const expertise = {
        equipment: {
            title: "Équipements de Pointe",
            items: [
                {
                    title: "Pelles Mécaniques",
                    description: "Dernière génération de pelles hydrauliques pour tous types de travaux",
                    specs: ["Capacité: 0.8-2.5m³", "Profondeur max: 6-12m", "GPS intégré"]
                },
                {
                    title: "Chargeuses",
                    description: "Chargeuses polyvalentes pour manipulation de matériaux",
                    specs: ["Capacité: 2.5-4.5m³", "Hauteur de levage: 4-6m", "Système anti-collision"]
                },
                // ... autres équipements
            ]
        },
        certifications: {
            title: "Certifications",
            items: [
                {
                    title: "ISO 9001:2015",
                    description: "Management de la qualité",
                    validUntil: "2025"
                },
                {
                    title: "ISO 14001:2015",
                    description: "Management environnemental",
                    validUntil: "2024"
                }
                // ... autres certifications
            ]
        },
        security: {
            title: "Sécurité",
            items: [
                {
                    title: "Formation continue",
                    description: "Programme de formation régulier pour tous les opérateurs",
                    frequency: "Mensuel"
                },
                {
                    title: "Protocoles de sécurité",
                    description: "Procédures strictes pour chaque type d'intervention",
                    lastUpdate: "2024"
                }
                // ... autres éléments de sécurité
            ]
        }
    };

    return (
        <section
            ref={ref}
            className={`py-20 bg-gradient-to-b from-blue-950 to-slate-900
                transition-all duration-1000 transform
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
            <div className="container mx-auto px-4">
                <h2 className="text-4xl font-bold text-white text-center mb-12">
                    Notre Expertise Technique
                </h2>

                {/* Navigation par onglets */}
                <div className="flex justify-center space-x-4 mb-12">
                    {Object.keys(expertise).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 rounded-lg transition-all duration-300
                                ${activeTab === tab
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                        >
                            {expertise[tab].title}
                        </button>
                    ))}
                </div>

                {/* Contenu des onglets */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {expertise[activeTab].items.map((item, index) => (
                        <div
                            key={index}
                            className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700
                                transform hover:scale-105 transition-all duration-300"
                        >
                            <h3 className="text-xl font-semibold text-white mb-4">{item.title}</h3>
                            <p className="text-slate-300 mb-4">{item.description}</p>

                            {/* Spécifications techniques */}
                            {item.specs && (
                                <div className="space-y-2">
                                    {item.specs.map((spec, i) => (
                                        <div key={i} className="flex items-center space-x-2">
                                            <Check className="w-4 h-4 text-blue-500 flex-shrink-0"/>
                                            <span className="text-slate-400">{spec}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Date de validité pour les certifications */}
                            {item.validUntil && (
                                <div className="mt-4 flex items-center space-x-2 text-slate-400">
                                    <Clock className="w-4 h-4"/>
                                    <span>Valide jusqu'en {item.validUntil}</span>
                                </div>
                            )}

                            {/* Fréquence pour la sécurité */}
                            {item.frequency && (
                                <div className="mt-4 flex items-center space-x-2 text-slate-400">
                                    <Calendar className="w-4 h-4"/>
                                    <span>Fréquence: {item.frequency}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
});

// Système de statistiques et analyses
const Statistics = memo(() => {
    const [stats, setStats] = useState({
        projectsCompleted: 0,
        satisfactionRate: 0,
        equipmentCount: 0,
        clientsServed: 0
    });
    const [ref, isVisible] = useIntersectionObserver({threshold: 0.2});

    useEffect(() => {
        if (isVisible) {
            // Animation des compteurs
            const duration = 2000; // 2 secondes
            const steps = 60;
            const interval = duration / steps;

            const targets = {
                projectsCompleted: 350,
                satisfactionRate: 98,
                equipmentCount: 250,
                clientsServed: 1200
            };

            let step = 0;
            const timer = setInterval(() => {
                step++;
                setStats({
                    projectsCompleted: Math.floor((targets.projectsCompleted * step) / steps),
                    satisfactionRate: Math.floor((targets.satisfactionRate * step) / steps),
                    equipmentCount: Math.floor((targets.equipmentCount * step) / steps),
                    clientsServed: Math.floor((targets.clientsServed * step) / steps)
                });

                if (step >= steps) {
                    clearInterval(timer);
                }
            }, interval);

            return () => clearInterval(timer);
        }
    }, [isVisible]);

    return (
        <section
            ref={ref}
            className={`py-20 bg-slate-900
                transition-all duration-1000 transform
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
            <div className="container mx-auto px-4">
                <h2 className="text-4xl font-bold text-white text-center mb-16">
                    BTP Xpress en Chiffres
                </h2>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    <StatCard
                        icon={Building2}
                        value={stats.projectsCompleted}
                        label="Projets Réalisés"
                        color="blue"
                    />
                    <StatCard
                        icon={Star}
                        value={stats.satisfactionRate}
                        label="Satisfaction Client"
                        suffix="%"
                        color="yellow"
                    />
                    <StatCard
                        icon={Wrench}
                        value={stats.equipmentCount}
                        label="Équipements"
                        color="green"
                    />
                    <StatCard
                        icon={Users}
                        value={stats.clientsServed}
                        label="Clients Servis"
                        color="purple"
                    />
                </div>
            </div>
        </section>
    );
});

// Carte statistique réutilisable
const StatCard = memo(({icon: Icon, value, label, suffix = '', color}) => {
    const getColorClass = (color) => {
        switch (color) {
            case 'blue':
                return 'text-blue-500';
            case 'yellow':
                return 'text-yellow-500';
            case 'green':
                return 'text-green-500';
            case 'purple':
                return 'text-purple-500';
            default:
                return 'text-blue-500';
        }
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700
            transform hover:scale-105 transition-all duration-300">
            <div className={`w-12 h-12 rounded-lg ${getColorClass(color)} bg-slate-700/50
                flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6"/>
            </div>
            <div className="space-y-2">
                <h3 className="text-3xl font-bold text-white">
                    {value.toLocaleString()}{suffix}
                </h3>
                <p className="text-slate-400">{label}</p>
            </div>
        </div>
    );
});

// Système de partenaires et références
const Partners = memo(() => {
    const [ref, isVisible] = useIntersectionObserver({threshold: 0.2});
    const [activePartner, setActivePartner] = useState(null);

    const partners = [
        {
            id: 1,
            name: "Construction Innovante SA",
            logo: "path/to/logo1.png",
            description: "Leader dans la construction durable",
            projects: 45,
            relationship: "10 ans de partenariat"
        },
        {
            id: 2,
            name: "Infrastructures & Co",
            logo: "path/to/logo2.png",
            description: "Spécialiste des grands ouvrages",
            projects: 32,
            relationship: "8 ans de partenariat"
        },
        // ... autres partenaires
    ];

    return (
        <section
            ref={ref}
            className={`py-20 bg-gradient-to-b from-slate-900 to-blue-950
                transition-all duration-1000 transform
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
            <div className="container mx-auto px-4">
                <h2 className="text-4xl font-bold text-white text-center mb-12">
                    Nos Partenaires de Confiance
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {partners.map(partner => (
                        <div
                            key={partner.id}
                            onClick={() => setActivePartner(partner)}
                            className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6
                                border border-slate-700 cursor-pointer
                                transform hover:scale-105 transition-all duration-300"
                        >
                            <div className="aspect-square bg-white/5 rounded-lg mb-4
                                flex items-center justify-center">
                                <Building2 className="w-12 h-12 text-slate-400"/>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">{partner.name}</h3>
                            <p className="text-slate-400 text-sm">{partner.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal des détails du partenaire */}
            <Modal
                isOpen={!!activePartner}
                onClose={() => setActivePartner(null)}
                title={activePartner?.name || ''}
            >
                {activePartner && (
                    <div className="space-y-6">
                        <div className="aspect-video bg-slate-800 rounded-lg
                            flex items-center justify-center">
                            <Building2 className="w-16 h-16 text-slate-400"/>
                        </div>

                        <div className="space-y-4">
                            <p className="text-slate-300">{activePartner.description}</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-sm font-medium text-slate-400">
                                        Projets réalisés ensemble
                                    </h4>
                                    <p className="text-2xl font-bold text-white">
                                        {activePartner.projects}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-slate-400">
                                        Partenariat
                                    </h4>
                                    <p className="text-2xl font-bold text-white">
                                        {activePartner.relationship}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setActivePartner(null)}
                                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700
                                    text-white rounded-lg transition-colors duration-300"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </section>
    );
});

// Formulaire de demande de devis avancé
const QuoteRequest = memo(() => {
    const [formData, setFormData] = useState({
        projectType: '',
        duration: '',
        budget: '',
        description: '',
        attachments: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [ref, isVisible] = useIntersectionObserver({threshold: 0.2});

    const handleFileChange = useCallback((e) => {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(file => file.size <= CONFIG.maxUploadSize);

        if (validFiles.length !== files.length) {
            // Notification pour les fichiers trop volumineux
            console.warn('Certains fichiers dépassent la taille limite de 5MB');
        }

        setFormData(prev => ({
            ...prev,
            attachments: [...prev.attachments, ...validFiles]
        }));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Simulation d'envoi
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Réinitialisation du formulaire
            setFormData({
                projectType: '',
                duration: '',
                budget: '',
                description: '',
                attachments: []
            });

            // Notification de succès
            console.log('Demande envoyée avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'envoi:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section
            ref={ref}
            className={`py-20 bg-gradient-to-b from-blue-950 to-slate-900
                transition-all duration-1000 transform
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
            <div className="container mx-auto px-4">
                <h2 className="text-4xl font-bold text-white text-center mb-12">
                    Demandez un Devis
                </h2>

                <div className="max-w-3xl mx-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Type de Projet
                                </label>
                                <select
                                    value={formData.projectType}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        projectType: e.target.value
                                    }))}
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg
                                        px-4 py-2 text-white focus:border-blue-500 transition-colors"
                                >
                                    <option value="">Sélectionnez...</option>
                                    <option value="construction">Construction</option>
                                    <option value="renovation">Rénovation</option>
                                    <option value="demolition">Démolition</option>
                                    <option value="terrassement">Terrassement</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Durée Estimée
                                </label>
                                <select
                                    value={formData.duration}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        duration: e.target.value
                                    }))}
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg
                                        px-4 py-2 text-white focus:border-blue-500 transition-colors"
                                >
                                    <option value="">Sélectionnez...</option>
                                    <option value="1-7">1-7 jours</option>
                                    <option value="8-30">8-30 jours</option>
                                    <option value="31-90">1-3 mois</option>
                                    <option value="90+">Plus de 3 mois</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Budget Prévu (FCFA)
                                </label>
                                <select
                                    value={formData.budget}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        budget: e.target.value
                                    }))}
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg
                                        px-4 py-2 text-white focus:border-blue-500 transition-colors"
                                >
                                    <option value="">Sélectionnez...</option>
                                    <option value="0-1M">Moins de 1M</option>
                                    <option value="1M-5M">1M - 5M</option>
                                    <option value="5M-20M">5M - 20M</option>
                                    <option value=">20M+">Plus de 20M</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Description du Projet
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    description: e.target.value
                                }))}
                                required
                                rows={6}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg
                                    px-4 py-2 text-white focus:border-blue-500 transition-colors
                                    resize-none"
                                placeholder="Décrivez votre projet en détail..."
                            />
                        </div>

                        {/* Zone de dépôt de fichiers */}
                        <div className="relative">
                            <input
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                                id="file-upload"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            />
                            <label
                                htmlFor="file-upload"
                                className="block w-full border-2 border-dashed border-slate-700
                                    rounded-lg p-8 text-center cursor-pointer
                                    hover:border-blue-500 transition-colors"
                            >
                                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-4"/>
                                <p className="text-slate-300">
                                    Déposez vos fichiers ici ou cliquez pour sélectionner
                                </p>
                                <p className="text-slate-400 text-sm mt-2">
                                    PDF, DOC, Images - Max. 5MB par fichier
                                </p>
                            </label>

                            {/* Liste des fichiers */}
                            {formData.attachments.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {formData.attachments.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between bg-slate-800
                                                rounded-lg p-3"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <FileText className="w-5 h-5 text-slate-400"/>
                                                <span className="text-slate-300">{file.name}</span>
                                                <span className="text-slate-400 text-sm">
                                                    ({Math.round(file.size / 1024)} Ko)
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    attachments: prev.attachments.filter((_, i) => i !== index)
                                                }))}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700
                                    text-white rounded-lg transition-all duration-300
                                    transform hover:scale-105 disabled:hover:scale-100
                                    flex items-center space-x-3"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin"/>
                                        <span>Envoi en cours...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5"/>
                                        <span>Envoyer la demande</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
});

// Système de blog et actualités
const BlogSection = memo(() => {
    const [articles, setArticles] = useState([]);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [ref, isVisible] = useIntersectionObserver({threshold: 0.2});

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                // Simulation de chargement des articles
                await new Promise(resolve => setTimeout(resolve, 1500));

                const mockArticles = [
                    {
                        id: 1,
                        title: "Innovation dans le BTP : Les Nouvelles Technologies",
                        excerpt: "Découvrez comment les nouvelles technologies transforment le secteur du BTP...",
                        content: "Article complet sur les innovations technologiques dans le BTP...",
                        author: "Jean Dupont",
                        date: "2024-01-15",
                        readTime: "5 min",
                        category: "Innovation"
                    },
                    {
                        id: 2,
                        title: "Sécurité sur les Chantiers : Bonnes Pratiques",
                        excerpt: "Guide complet des mesures de sécurité essentielles sur les chantiers...",
                        content: "Article complet sur la sécurité des chantiers...",
                        author: "Marie Martin",
                        date: "2024-01-10",
                        readTime: "8 min",
                        category: "Sécurité"
                    },
                    // ... autres articles
                ];

                setArticles(mockArticles);
            } catch (error) {
                console.error('Erreur de chargement des articles:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (isVisible) {
            fetchArticles();
        }
    }, [isVisible]);

    return (
        <section
            ref={ref}
            className={`py-20 bg-gradient-to-b from-slate-900 to-blue-950
                transition-all duration-1000 transform
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
            <div className="container mx-auto px-4">
                <h2 className="text-4xl font-bold text-white text-center mb-12">
                    Actualités et Ressources
                </h2>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin"/>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {articles.map(article => (
                            <article
                                key={article.id}
                                onClick={() => setSelectedArticle(article)}
                                className="bg-slate-800/30 backdrop-blur-sm rounded-xl overflow-hidden
                                    border border-slate-700 cursor-pointer
                                    transform hover:scale-105 transition-all duration-300"
                            >
                                {/* Image de couverture */}
                                <div className="aspect-video bg-slate-700 relative">
                                    <div
                                        className="absolute inset-0 flex items-center justify-center">
                                        <Image className="w-12 h-12 text-slate-500"/>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <span className="px-3 py-1 bg-blue-600/20 text-blue-400
                                            rounded-full text-sm">
                                            {article.category}
                                        </span>
                                        <span className="text-slate-400 text-sm">
                                            {article.readTime}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-semibold text-white mb-3">
                                        {article.title}
                                    </h3>

                                    <p className="text-slate-300 mb-4 line-clamp-3">
                                        {article.excerpt}
                                    </p>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-700
                                                flex items-center justify-center">
                                                <UserCircle className="w-6 h-6 text-slate-400"/>
                                            </div>
                                            <span className="text-slate-400 text-sm">
                                                {article.author}
                                            </span>
                                        </div>
                                        <span className="text-slate-400 text-sm">
                                            {new Date(article.date).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {/* Modal de l'article complet */}
                <Modal
                    isOpen={!!selectedArticle}
                    onClose={() => setSelectedArticle(null)}
                    title={selectedArticle?.title || ''}
                >
                    {selectedArticle && (
                        <div className="space-y-6">
                            <div className="aspect-video bg-slate-700 rounded-lg relative">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Image className="w-16 h-16 text-slate-500"/>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-700
                                        flex items-center justify-center">
                                        <UserCircle className="w-8 h-8 text-slate-400"/>
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">
                                            {selectedArticle.author}
                                        </p>
                                        <p className="text-slate-400 text-sm">
                                            {new Date(selectedArticle.date).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400
                                        rounded-full text-sm">
                                        {selectedArticle.category}
                                    </span>
                                    <span className="text-slate-400 text-sm">
                                        {selectedArticle.readTime}
                                    </span>
                                </div>
                            </div>

                            <div className="prose prose-invert max-w-none">
                                <p className="text-slate-300">{selectedArticle.content}</p>
                            </div>

                            <div className="flex justify-between items-center pt-6
                                border-t border-slate-700">
                                <div className="flex space-x-4">
                                    <button className="text-slate-400 hover:text-white
                                        transition-colors flex items-center space-x-2">
                                        <Heart className="w-5 h-5"/>
                                        <span>J'aime</span>
                                    </button>
                                    <button className="text-slate-400 hover:text-white
                                        transition-colors flex items-center space-x-2">
                                        <Share2 className="w-5 h-5"/>
                                        <span>Partager</span>
                                    </button>
                                </div>
                                <button className="text-slate-400 hover:text-white
                                    transition-colors flex items-center space-x-2">
                                    <Bookmark className="w-5 h-5"/>
                                    <span>Sauvegarder</span>
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </section>
    );
});

// Composant newsletter amélioré
const Newsletter = memo(() => {
    const [email, setEmail] = useState('');
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [ref, isVisible] = useIntersectionObserver({threshold: 0.2});

    const handleSubscribe = async (e) => {
        e.preventDefault();
        setIsSubscribing(true);

        try {
            // Simulation d'inscription
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Réinitialisation
            setEmail('');

            // Notification de succès
            console.log('Inscription réussie');
        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error);
        } finally {
            setIsSubscribing(false);
        }
    };

    return (
        <section
            ref={ref}
            className={`py-20 bg-blue-950
                transition-all duration-1000 transform
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
            <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center space-y-8">
                    <h2 className="text-4xl font-bold text-white">
                        Restez Informé
                    </h2>
                    <p className="text-xl text-slate-300">
                        Abonnez-vous à notre newsletter pour recevoir nos actualités,
                        conseils et offres exclusives.
                    </p>

                    <form onSubmit={handleSubscribe} className="flex space-x-4">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Votre adresse email"
                            required
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-6 py-4
                                text-white placeholder-slate-400 focus:border-blue-500 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={isSubscribing}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700
                                text-white rounded-lg transition-all duration-300
                                flex items-center space-x-3 whitespace-nowrap"
                        >
                            {isSubscribing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin"/>
                                    <span>Inscription...</span>
                                </>
                            ) : (
                                <>
                                    <Mail className="w-5 h-5"/>
                                    <span>S'abonner</span>
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-sm text-slate-400">
                        En vous inscrivant, vous acceptez de recevoir nos communications par email.
                        Vous pourrez vous désabonner à tout moment.
                    </p>
                </div>
            </div>
        </section>
    );
});

// Système de Faq avancé avec recherche
const Faq = memo(() => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeItem, setActiveItem] = useState(null);
    const [ref, isVisible] = useIntersectionObserver({threshold: 0.2});

    const faqItems = [
        {
            question: "Quels types d'équipements proposez-vous à la location ?",
            answer: "Nous proposons une large gamme d'équipements BTP incluant des pelles mécaniques, chargeuses, compresseurs, groupes électrogènes, et bien plus encore. Tous nos équipements sont régulièrement entretenus et répondent aux normes de sécurité en vigueur.",
            category: "Équipements"
        },
        {
            question: "Comment fonctionne le processus de location ?",
            answer: "Le processus de location est simple : contactez-nous pour vérifier la disponibilité, choisissez la durée de location, nous établissons un devis détaillé, et après validation, nous organisons la livraison sur votre chantier. Un état des lieux est effectué au départ et au retour de l'équipement.",
            category: "Location"
        },
        {
            question: "Quelles sont vos zones d'intervention ?",
            answer: "Nous intervenons principalement dans toute la Côte d'Ivoire, avec des agences à Abidjan, Yamoussoukro et San Pedro. Nous pouvons également étudier des demandes pour d'autres régions selon les projets.",
            category: "Services"
        }
        // ... autres questions fréquentes
    ];

    const filteredItems = useMemo(() => {
        const normalized = searchTerm.toLowerCase().trim();
        if (!normalized) return faqItems;

        return faqItems.filter(item =>
            item.question.toLowerCase().includes(normalized) ||
            item.answer.toLowerCase().includes(normalized)
        );
    }, [searchTerm]);

    return (
        <section
            ref={ref}
            className={`py-20 bg-gradient-to-b from-blue-950 to-slate-900
                transition-all duration-1000 transform
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
            <div className="container mx-auto px-4">
                <h2 className="text-4xl font-bold text-white text-center mb-12">
                    Questions Fréquentes
                </h2>

                {/* Barre de recherche */}
                <div className="max-w-2xl mx-auto mb-12">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Rechercher une question..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg
                                px-6 py-4 text-white placeholder-slate-400
                                focus:border-blue-500 transition-colors pr-12"
                        />
                        <Search className="absolute right-4 top-1/2 transform -translate-y-1/2
                            w-5 h-5 text-slate-400"/>
                    </div>
                </div>

                {/* Liste des questions */}
                <div className="max-w-3xl mx-auto space-y-4">
                    {filteredItems.map((item, index) => (
                        <div
                            key={index}
                            className="bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700
                                overflow-hidden transition-all duration-300"
                        >
                            <button
                                onClick={() => setActiveItem(activeItem === index ? null : index)}
                                className="w-full px-6 py-4 flex items-center justify-between
                                    hover:bg-slate-800/50 transition-colors"
                            >
                                <span className="text-white font-medium text-left">
                                    {item.question}
                                </span>
                                <ChevronDown
                                    className={`w-5 h-5 text-slate-400 transform transition-transform
                                        duration-300 ${activeItem === index ? 'rotate-180' : ''}`}
                                />
                            </button>

                            <div
                                className={`overflow-hidden transition-all duration-300
                                    ${activeItem === index ? 'max-h-96' : 'max-h-0'}`}
                            >
                                <div className="px-6 py-4 border-t border-slate-700">
                                    <p className="text-slate-300">{item.answer}</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredItems.length === 0 && (
                        <div className="text-center py-12">
                            <SearchX className="w-12 h-12 text-slate-400 mx-auto mb-4"/>
                            <p className="text-slate-300">
                                Aucune question ne correspond à votre recherche.
                            </p>
                            <button
                                onClick={() => setSearchTerm('')}
                                className="mt-4 text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                Réinitialiser la recherche
                            </button>
                        </div>
                    )}
                </div>

                {/* Contact supplémentaire */}
                <div className="max-w-2xl mx-auto mt-12 text-center">
                    <p className="text-slate-300 mb-4">
                        Vous ne trouvez pas la réponse à votre question ?
                    </p>
                    <button
                        onClick={() => {
                            // Déclencher l'ouverture du formulaire de contact
                        }}
                        className="inline-flex items-center space-x-2 px-6 py-3
                            bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                            transition-colors duration-300"
                    >
                        <MessageCircle className="w-5 h-5"/>
                        <span>Contactez-nous directement</span>
                    </button>
                </div>
            </div>
        </section>
    );
});

// Footer enrichi
const Footer = memo(() => {
    const [currentYear] = useState(new Date().getFullYear());

    return (
        <footer className="bg-slate-900 pt-20 pb-8">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* À propos */}
                    <div>
                        <div className="flex items-center space-x-2 mb-6">
                            <img
                                src={btpXpressLogo}
                                alt="BTP Xpress Logo"
                                className="w-10 h-10 object-contain"
                            />
                            <span className="text-xl font-bold text-white">BTP Xpress</span>
                        </div>
                        <p className="text-slate-300 mb-6">
                            Leader dans la location d'équipements BTP en Côte d'Ivoire.
                            Notre engagement : qualité, fiabilité et service d'excellence.
                        </p>
                        <div className="flex space-x-4">
                            {/* Réseaux sociaux */}
                            {socialLinks.map(link => (
                                <a
                                    key={link.name}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700
                                        flex items-center justify-center text-slate-300
                                        hover:text-white transition-colors"
                                >
                                    <link.icon className="w-5 h-5"/>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Services */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-6">Nos Services</h3>
                        <ul className="space-y-4">
                            {SERVICES.map(service => (
                                <li key={service.id}>
                                    <a
                                        href={`#service-${service.id}`}
                                        className="text-slate-300 hover:text-white transition-colors
                                            flex items-center space-x-2"
                                    >
                                        <service.icon className="w-5 h-5"/>
                                        <span>{service.title}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact rapide */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-6">Contact Rapide</h3>
                        <ul className="space-y-4">
                            {contactInfo.map((info, index) => (
                                <li key={index}>
                                    <a
                                        href={info.href}
                                        className="text-slate-300 hover:text-white transition-colors
                                            flex items-center space-x-2"
                                    >
                                        <info.icon className="w-5 h-5"/>
                                        <span>{info.text}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Newsletter et certifications */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-6">
                            Restez Informé
                        </h3>
                        <form className="space-y-4 mb-6">
                            <input
                                type="email"
                                placeholder="Votre email..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg
                                    px-4 py-2 text-white placeholder-slate-400
                                    focus:border-blue-500 transition-colors"
                            />
                            <button
                                type="submit"
                                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700
                                    text-white rounded-lg transition-colors flex items-center
                                    justify-center space-x-2"
                            >
                                <Mail className="w-5 h-5"/>
                                <span>S'abonner</span>
                            </button>
                        </form>

                        <div>
                            <h4 className="text-white font-medium mb-4">Certifications</h4>
                            <div className="flex space-x-4">
                                {certifications.map((cert, index) => (
                                    <div
                                        key={index}
                                        className="w-12 h-12 bg-slate-800 rounded-lg
                                            flex items-center justify-center"
                                    >
                                        <cert.icon className="w-6 h-6 text-slate-300"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mentions légales et crédits */}
                <div className="border-t border-slate-800 pt-8">
                    <div
                        className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <div className="text-slate-400 text-sm">
                            © {currentYear} BTP Xpress. Tous droits réservés.
                        </div>
                        <div className="flex space-x-6">
                            {legalLinks.map(link => (
                                <a
                                    key={link.text}
                                    href={link.href}
                                    className="text-slate-400 hover:text-white text-sm
                                        transition-colors"
                                >
                                    {link.text}
                                </a>
                            ))}
                        </div>
                        <div className="flex items-center space-x-2 text-slate-400 text-sm">
                            <span>Développé par</span>
                            <img
                                src={lionsDevLogo}
                                alt="Lions Dev Logo"
                                className="h-6 object-contain"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
});

// Données de configuration
const socialLinks = [
    {name: 'Facebook', icon: Facebook, url: '#'},
    {name: 'Twitter', icon: Twitter, url: '#'},
    {name: 'LinkedIn', icon: Linkedin, url: '#'},
    {name: 'Instagram', icon: Instagram, url: '#'}
];

const contactInfo = [
    {
        icon: Phone,
        text: '+225 07 79 56 72 97',
        href: 'tel:+22507795672 97'
    },
    {
        icon: Mail,
        text: 'contact@btpxpress.lions.dev',
        href: 'mailto:contact@btpxpress.lions.dev'
    },
    {
        icon: MapPin,
        text: 'Cocody, Abidjan',
        href: 'https://goo.gl/maps/abidjan'
    },
    {
        icon: MessageCircle,
        text: 'WhatsApp',
        href: 'https://wa.me/225 07 79 56 72 97'
    }
];

const legalLinks = [
    {text: 'Mentions légales', href: '#'},
    {text: 'Politique de confidentialité', href: '#'},
    {text: 'Conditions d\'utilisation', href: '#'},
    {text: 'Cookies', href: '#'}
];

const certifications = [
    {icon: ShieldCheck, name: 'ISO 9001'},
    {icon: Award, name: 'ISO 14001'},
    {icon: Award, name: 'OHSAS 18001'}
];

const Hero = memo(({ isVisible }) => {
    const benefits = [
        {
            icon: ShieldCheck,
            text: "Équipements certifiés aux normes de sécurité"
        },
        {
            icon: Star,
            text: "Service client disponible 24/7"
        },
        {
            icon: Clock,
            text: "Livraison rapide sur tout le territoire"
        }
    ];

    return (
        <section className={`min-h-screen pt-32 pb-20 relative overflow-hidden
            bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900
            transition-all duration-1000 transform
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-4xl mx-auto text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6
                        bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text">
                        Location d'Équipements BTP Professionnels
                    </h1>
                    <p className="text-xl text-slate-300 mb-8">
                        Accédez aux meilleurs équipements de construction pour vos projets.
                        Service professionnel, matériel de qualité, assistance 24/7.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button onClick={() => document.getElementById('equipements').scrollIntoView({ behavior: 'smooth' })}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-700
                            text-white rounded-lg transition-all duration-300
                            transform hover:scale-105 flex items-center space-x-2">
                            <span>Voir nos équipements</span>
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700
                            text-white rounded-lg transition-all duration-300
                            transform hover:scale-105">
                            Demander un devis
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    {benefits.map((benefit, index) => (
                        <div key={index} className="bg-slate-800/30 backdrop-blur-sm
                            rounded-xl p-6 border border-slate-700
                            transform hover:scale-105 transition-all duration-300">
                            <div className="flex items-center space-x-4">
                                <benefit.icon className="w-8 h-8 text-blue-400" />
                                <p className="text-slate-300">{benefit.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Effets de fond décoratifs */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-64 h-64
                    bg-blue-500 rounded-full filter blur-3xl opacity-20
                    animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64
                    bg-purple-500 rounded-full filter blur-3xl opacity-20
                    animate-pulse delay-1000" />
            </div>
        </section>
    );
});

const ServiceCard = memo(({ icon: Icon, title, description, benefits }) => {
    return (
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700
            transform hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center
                justify-center mb-4">
                <Icon className="w-6 h-6 text-blue-400" />
            </div>

            <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
            <p className="text-slate-300 mb-4">{description}</p>

            <ul className="space-y-2">
                {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start space-x-2">
                        <ChevronRight className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                        <span className="text-slate-400">{benefit}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
});

const Services = memo(() => {
    const services = [
        {
            icon: Truck,
            title: "Location d'Équipements",
            description: "Une large gamme d'équipements BTP de qualité pour vos chantiers",
            benefits: [
                "Matériel récent et entretenu",
                "Livraison et installation sur site",
                "Support technique disponible"
            ]
        },
        {
            icon: Wrench,
            title: "Maintenance Préventive",
            description: "Service de maintenance régulière pour garantir la performance",
            benefits: [
                "Inspections périodiques",
                "Entretien programmé",
                "Réparations rapides"
            ]
        },
        {
            icon: HardHat,
            title: "Conseil Technique",
            description: "Expertise professionnelle pour vos projets de construction",
            benefits: [
                "Évaluation des besoins",
                "Optimisation des ressources",
                "Accompagnement personnalisé"
            ]
        },
        {
            icon: Clock,
            title: "Location Longue Durée",
            description: "Solutions flexibles pour vos projets à long terme",
            benefits: [
                "Tarifs dégressifs",
                "Maintenance incluse",
                "Renouvellement facilité"
            ]
        },
        {
            icon: ShieldCheck,
            title: "Conformité & Sécurité",
            description: "Garantie de respect des normes et standards du secteur",
            benefits: [
                "Certifications à jour",
                "Formation sécurité",
                "Équipements aux normes"
            ]
        },
        {
            icon: Users,
            title: "Formation Opérateurs",
            description: "Programmes de formation pour vos équipes",
            benefits: [
                "Formation pratique",
                "Certification officielle",
                "Mise à niveau régulière"
            ]
        }
    ];

    return (
        <section className="py-20 bg-gradient-to-b from-slate-900 to-blue-950">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-white mb-4">
                        Nos Services
                    </h2>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                        Des solutions complètes pour répondre à tous vos besoins en équipements
                        et services BTP.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((service, index) => (
                        <ServiceCard key={index} {...service} />
                    ))}
                </div>
            </div>
        </section>
    );
});

const Testimonial = memo(({ name, company, role, rating, content, date }) => {
    return (
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            {/* En-tête du témoignage */}
            <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                    <UserCircle className="w-12 h-12 text-slate-400" />
                    <div className="absolute -top-1 -right-1 bg-blue-600 rounded-full p-1">
                        <Building2 className="w-4 h-4 text-white" />
                    </div>
                </div>
                <div>
                    <h4 className="text-lg font-semibold text-white">{name}</h4>
                    <p className="text-slate-400">
                        {role} chez {company}
                    </p>
                </div>
            </div>

            {/* Système de notation */}
            <div className="flex mb-4">
                {[...Array(5)].map((_, index) => (
                    <Star
                        key={index}
                        className={`w-5 h-5 ${
                            index < rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-slate-600'
                        }`}
                    />
                ))}
            </div>

            {/* Contenu du témoignage */}
            <blockquote className="text-slate-300 mb-4">
                "{content}"
            </blockquote>

            {/* Date du témoignage */}
            <p className="text-sm text-slate-400">
                {new Date(date).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long'
                })}
            </p>
        </div>
    );
});

const Testimonials = memo(() => {
    const [currentPage, setCurrentPage] = useState(0);

    // Données de témoignages
    const testimonials = [
        {
            name: "Thomas Koné",
            company: "Constructions Modernes SA",
            role: "Directeur de Projet",
            rating: 5,
            content: "BTP Xpress a révolutionné notre approche de la location d'équipements. Leur service est rapide, professionnel et le matériel est toujours en excellent état. Un partenaire de confiance pour tous nos projets.",
            date: "2024-01-15"
        },
        {
            name: "Marie Touré",
            company: "Bâtisseurs & Co",
            role: "Responsable Chantier",
            rating: 5,
            content: "La qualité du service client est exceptionnelle. Leur réactivité et leur expertise technique nous ont permis de respecter nos délais même dans des situations complexes.",
            date: "2024-01-10"
        },
        {
            name: "Ibrahim Diallo",
            company: "GC Construction",
            role: "Directeur Technique",
            rating: 4,
            content: "Un excellent rapport qualité-prix et un service de maintenance très efficace. Les équipements sont modernes et bien entretenus. Je recommande vivement leurs services.",
            date: "2023-12-20"
        }
    ];

    // Configuration du carrousel
    const itemsPerPage = 1;
    const totalPages = Math.ceil(testimonials.length / itemsPerPage);

    // Gestion de la navigation
    const handlePrevious = useCallback(() => {
        setCurrentPage(prev => (prev > 0 ? prev - 1 : totalPages - 1));
    }, [totalPages]);

    const handleNext = useCallback(() => {
        setCurrentPage(prev => (prev < totalPages - 1 ? prev + 1 : 0));
    }, [totalPages]);

    return (
        <section className="py-20 bg-gradient-to-b from-blue-950 to-slate-900">
            <div className="container mx-auto px-4">
                {/* En-tête de la section */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-white mb-4">
                        La Satisfaction de Nos Clients
                    </h2>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                        Découvrez ce que nos clients disent de notre engagement
                        envers l'excellence et la qualité de service.
                    </p>
                </div>

                {/* Carrousel de témoignages */}
                <div className="max-w-4xl mx-auto">
                    <div className="relative">
                        {/* Container des témoignages */}
                        <div className="overflow-hidden">
                            <div className="flex transition-transform duration-500"
                                 style={{
                                     transform: `translateX(-${currentPage * 100}%)`,
                                     width: `${testimonials.length * 100}%`
                                 }}>
                                {testimonials.map((testimonial, index) => (
                                    <div
                                        key={index}
                                        className="w-full px-4"
                                        style={{ flex: `0 0 ${100 / testimonials.length}%` }}>
                                        <Testimonial {...testimonial} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Boutons de navigation */}
                        <button
                            onClick={handlePrevious}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12
                                bg-slate-800 hover:bg-slate-700 text-white rounded-full p-2
                                transition-colors duration-300">
                            <ChevronLeft className="w-6 h-6" />
                        </button>

                        <button
                            onClick={handleNext}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12
                                bg-slate-800 hover:bg-slate-700 text-white rounded-full p-2
                                transition-colors duration-300">
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Indicateurs de pagination */}
                    <div className="flex justify-center mt-8 space-x-2">
                        {[...Array(totalPages)].map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentPage(index)}
                                className={`w-3 h-3 rounded-full transition-colors duration-300 
                                    ${index === currentPage
                                    ? 'bg-blue-500'
                                    : 'bg-slate-600 hover:bg-slate-500'}`}
                                aria-label={`Aller au témoignage ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
});

// Composant Header
const Header = memo(({ isVisible, onContactClick, isOffline }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const handleScroll = useDebouncedCallback(() => {
        setIsScrolled(window.scrollY > 50);
    }, 100);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 
            ${isScrolled ? 'bg-slate-900/95 shadow-lg backdrop-blur-sm py-2' : 'bg-transparent py-4'}`}>
            <div className="container mx-auto px-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <img src={btpXpressLogo} alt="BTP Xpress Logo" className="w-10 h-10 object-contain" />
                    <span className="text-white font-bold text-xl">BTP Xpress</span>
                </div>

                <div className="flex items-center space-x-4">
                    <button onClick={onContactClick}
                            className="hidden md:inline-flex items-center space-x-2 px-4 py-2
                        bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300">
                        <Phone className="w-4 h-4" />
                        <span>Contactez-nous</span>
                    </button>

                    {isOffline && (
                        <div className="text-yellow-500 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm">Hors ligne</span>
                        </div>
                    )}

                    <a href="/admin" className="inline-flex items-center space-x-2 px-4 py-2
                        bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-300">
                        <UserCircle className="w-5 h-5" />
                        <span>Admin</span>
                    </a>
                </div>
            </div>
        </header>
    );
});

const ContactForm = memo(({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        contactPreference: 'email'
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    const validateForm = useCallback(() => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Le nom est requis';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'L\'email est requis';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email invalide';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Le téléphone est requis';
        } else if (!/^[+\d\s-]{8,}$/.test(formData.phone)) {
            newErrors.phone = 'Numéro de téléphone invalide';
        }

        if (!formData.message.trim()) {
            newErrors.message = 'Le message est requis';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus(null);

        try {
            // Simulation d'un appel API
            await new Promise(resolve => setTimeout(resolve, 1500));

            setSubmitStatus({
                type: 'success',
                message: 'Votre message a été envoyé avec succès!'
            });

            // Réinitialisation du formulaire
            setFormData({
                name: '',
                email: '',
                phone: '',
                subject: '',
                message: '',
                contactPreference: 'email'
            });

            // Fermeture après un délai
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (error) {
            setSubmitStatus({
                type: 'error',
                message: 'Une erreur est survenue. Veuillez réessayer.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="min-h-screen px-4 flex items-center justify-center">
                {/* Overlay */}
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                     onClick={onClose} />

                {/* Modal */}
                <div className="relative bg-slate-900 rounded-xl w-full max-w-2xl
                    shadow-xl border border-slate-700">
                    {/* En-tête */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <h2 className="text-2xl font-semibold text-white">
                            Contactez-nous
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Corps */}
                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Nom */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Nom complet*
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            name: e.target.value
                                        }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg
                                            px-4 py-2 text-white focus:border-blue-500 transition-colors"
                                    />
                                    {errors.name && (
                                        <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Email*
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            email: e.target.value
                                        }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg
                                            px-4 py-2 text-white focus:border-blue-500 transition-colors"
                                    />
                                    {errors.email && (
                                        <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                                    )}
                                </div>

                                {/* Téléphone */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Téléphone*
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            phone: e.target.value
                                        }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg
                                            px-4 py-2 text-white focus:border-blue-500 transition-colors"
                                    />
                                    {errors.phone && (
                                        <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                                    )}
                                </div>

                                {/* Sujet */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Sujet
                                    </label>
                                    <select
                                        value={formData.subject}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            subject: e.target.value
                                        }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg
                                            px-4 py-2 text-white focus:border-blue-500 transition-colors"
                                    >
                                        <option value="">Sélectionnez...</option>
                                        <option value="location">Location d'équipement</option>
                                        <option value="devis">Demande de devis</option>
                                        <option value="info">Renseignements</option>
                                        <option value="support">Support technique</option>
                                    </select>
                                </div>
                            </div>

                            {/* Mode de contact préféré */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Mode de contact préféré
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { value: 'email', label: 'Email', icon: Mail },
                                        { value: 'phone', label: 'Téléphone', icon: Phone },
                                        { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                                        { value: 'visit', label: 'Visite', icon: MapPin }
                                    ].map(option => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                contactPreference: option.value
                                            }))}
                                            className={`p-3 rounded-lg border flex flex-col items-center
                                                justify-center space-y-2 transition-colors
                                                ${formData.contactPreference === option.value
                                                ? 'bg-blue-600 border-blue-500 text-white'
                                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            <option.icon className="w-6 h-6" />
                                            <span className="text-sm">{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Message*
                                </label>
                                <textarea
                                    value={formData.message}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        message: e.target.value
                                    }))}
                                    rows={5}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg
                                        px-4 py-2 text-white focus:border-blue-500 transition-colors
                                        resize-none"
                                />
                                {errors.message && (
                                    <p className="mt-1 text-sm text-red-500">{errors.message}</p>
                                )}
                            </div>

                            {/* Message de statut */}
                            {submitStatus && (
                                <div className={`p-4 rounded-lg ${
                                    submitStatus.type === 'success'
                                        ? 'bg-green-600/20 text-green-400'
                                        : 'bg-red-600/20 text-red-400'
                                }`}>
                                    {submitStatus.message}
                                </div>
                            )}

                            {/* Bouton d'envoi */}
                            <div className="flex justify-end space-x-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2 text-slate-300 hover:text-white
                                        transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700
                                        disabled:bg-slate-700 text-white rounded-lg
                                        transition-colors flex items-center space-x-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Envoi...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            <span>Envoyer</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
});

const Modal = memo(({
                        isOpen,
                        onClose,
                        title,
                        children,
                        size = 'default',
                        showCloseButton = true
                    }) => {
    const handleEscape = useCallback((event) => {
        if (event.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'visible';
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    const sizeClasses = {
        small: 'max-w-md',
        default: 'max-w-2xl',
        large: 'max-w-4xl',
        full: 'max-w-full mx-4'
    };

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className="min-h-screen px-4 flex items-center justify-center">
                {/* Overlay avec effet de flou */}
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Contenu du modal */}
                <div
                    className={`relative bg-slate-900 rounded-xl w-full ${sizeClasses[size]}
                        shadow-xl border border-slate-700 transform transition-all duration-300
                        ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                >
                    {/* En-tête */}
                    {(title || showCloseButton) && (
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            {title && (
                                <h2
                                    id="modal-title"
                                    className="text-2xl font-semibold text-white"
                                >
                                    {title}
                                </h2>
                            )}

                            {showCloseButton && (
                                <button
                                    onClick={onClose}
                                    className="text-slate-400 hover:text-white transition-colors
                                        focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                                    aria-label="Fermer"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Corps */}
                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
});

const LocationCard = memo(({
                               city,
                               address,
                               phone,
                               hours,
                               image = null,
                               services = []
                           }) => {
    return (
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl overflow-hidden
            border border-slate-700 transform hover:scale-105 transition-all duration-300">
            {/* Image de l'agence */}
            <div className="aspect-video relative bg-slate-700">
                {image ? (
                    <img
                        src={image}
                        alt={`Agence de ${city}`}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-slate-500" />
                    </div>
                )}
            </div>

            <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">
                    {city}
                </h3>

                <div className="space-y-4">
                    {/* Adresse */}
                    <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                        <p className="text-slate-300">{address}</p>
                    </div>

                    {/* Téléphone */}
                    <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        <a
                            href={`tel:${phone.replace(/\s/g, '')}`}
                            className="text-slate-300 hover:text-white transition-colors"
                        >
                            {phone}
                        </a>
                    </div>

                    {/* Horaires */}
                    <div className="flex items-start space-x-3">
                        <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                        <div className="text-slate-300">
                            {hours.map((hour, index) => (
                                <p key={index}>{hour}</p>
                            ))}
                        </div>
                    </div>

                    {/* Services disponibles */}
                    {services.length > 0 && (
                        <div className="border-t border-slate-700 pt-4 mt-4">
                            <h4 className="text-sm font-medium text-slate-400 mb-2">
                                Services disponibles
                            </h4>
                            <ul className="space-y-2">
                                {services.map((service, index) => (
                                    <li key={index} className="flex items-center space-x-2">
                                        <ChevronRight className="w-4 h-4 text-blue-400" />
                                        <span className="text-slate-300">{service}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Bouton d'action */}
                <button className="w-full mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700
                    text-white rounded-lg transition-colors flex items-center justify-center
                    space-x-2">
                    <span>Nous contacter</span>
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
});

// Composant principal
const LandingPage = memo(() => {
    const [isVisible, setIsVisible] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [showContactForm, setShowContactForm] = useState(false);
    const isOffline = useOfflineDetection(); // Correction ici, on ne déstructure plus le retour

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => setShowNotification(true), 3000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isOffline) {
            onNotification({
                type: 'warning',
                title: 'Mode hors ligne',
                content: 'Certaines fonctionnalités peuvent être limitées'
            });
        }
    }, [isOffline]);

    const handleContactClick = useCallback(() => {
        setShowContactForm(true);
    }, []);

    const onNotification = useCallback(({type, title, content}) => {
        // Logique de notification
    }, []);

    return (
        <div className="relative bg-slate-900 min-h-screen">
            {/* Composants principaux */}
            <Header
                isVisible={isVisible}
                onContactClick={handleContactClick}
                isOffline={isOffline}
            />
            <Hero isVisible={isVisible}/>
            <Services/>
            <Statistics/>
            <ProjectGallery/>
            <ReservationSystem/>
            <TechnicalExpertise/>
            <Testimonials/>
            <Partners/>
            <BlogSection/>
            <Faq/>
            <Newsletter/>
            <Footer/>

            {/* Composants flottants */}
            <LiveChat/>
            {showContactForm && (
                <ContactForm
                    isOpen={showContactForm}
                    onClose={() => setShowContactForm(false)}
                />
            )}
            {showNotification && (
                <EnhancedNotification
                    title="👋 Bienvenue chez BTP Xpress!"
                    content="Notre équipe est disponible pour répondre à toutes vos questions."
                    onClose={() => setShowNotification(false)}
                />
            )}
        </div>
    );
});

// Styles globaux pour l'application
const globalStyles = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes scaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }

    @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
    }

    .animate-scale-in {
        animation: scaleIn 0.3s ease-out;
    }

    .animate-slide-in {
        animation: slideIn 0.3s ease-out;
    }

    .group:hover .group-hover\\:translate-x-1 {
        transform: translateX(0.25rem);
    }

    /* Styles des formulaires */
    input, textarea, select {
        padding: 0.5rem 0.75rem;
    }

    input:focus, textarea:focus, select:focus {
        outline: none;
        border-color: rgb(59, 130, 246);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    /* Styles pour le mode sombre */
    .dark {
        color-scheme: dark;
    }

    /* Styles pour l'accessibilité */
    @media (prefers-reduced-motion: reduce) {
        *, ::before, ::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
        }
    }

    /* Optimisations pour le mobile */
    @media (max-width: 768px) {
        .container {
            padding-left: 1rem;
            padding-right: 1rem;
        }

        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }

        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
    }

    /* Styles d'impression */
    @media print {
        .no-print {
            display: none !important;
        }
    }
`;

// Définition des noms d'affichage pour le débogage
Object.entries({
    Header,
    Hero,
    Services,
    Statistics,
    ProjectGallery,
    ReservationSystem,
    TechnicalExpertise,
    Testimonials,
    Partners,
    BlogSection,
    Faq,
    Newsletter,
    Footer,
    LiveChat,
    ContactForm,
    EnhancedNotification,
    StatCard,
    Modal,
    ServiceCard,
    Testimonial,
    LocationCard
}).forEach(([name, component]) => {
    component.displayName = name;
});

export default memo(LandingPage);