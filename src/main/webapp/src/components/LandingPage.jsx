import React, { useEffect, useState } from 'react';
import { Loader2, Phone, Mail, MessageCircle, UserCircle } from 'lucide-react';
import btpXpressLogo from '../assets/btpxpress-logo.png';
import lionsDevLogo from '../assets/logolionsdev.png';

const LandingPage = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center relative p-4">
            <div className="absolute top-4 right-4">
                <a href="/admin"
                   title="Connexion Administrateur"
                   className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-300 shadow-md hover:shadow-lg">
                    <UserCircle className="w-5 h-5" />
                    <span>Admin</span>
                </a>
            </div>

            <div className={`transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="text-center space-y-8">
                    <div className="space-y-4">
                        <div className="w-32 h-32 mx-auto rounded-lg shadow-lg flex items-center justify-center transform hover:scale-105 transition-transform duration-300 overflow-hidden bg-white p-2">
                            <img src={btpXpressLogo} alt="BTP Xpress Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-100 tracking-tight">
                            BTP Xpress
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-300 font-light">
                            Côte d'Ivoire
                        </p>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-6 bg-slate-900/50 backdrop-blur-lg rounded-lg p-8 shadow-xl border border-slate-800">
                        <div className="flex flex-col items-center justify-center gap-3">
                            <h2 className="text-2xl md:text-3xl font-semibold text-slate-100">
                                🚧  Notre site est en construction 🚧
                            </h2>
                            <p className="text-lg text-slate-400 italic">
                                "L'excellence dans chaque projet, la satisfaction dans chaque service"
                            </p>
                            <p className="text-sm text-slate-500">
                                - Aly Muhammad GBANE, CEO
                            </p>
                        </div>
                        <p className="text-lg text-slate-300">
                            Nous préparons une expérience exceptionnelle pour répondre à tous vos besoins en équipements BTP et services de construction.
                        </p>
                        <div className="flex items-center justify-center space-x-2 text-slate-400">
                            <Loader2 className="animate-spin w-6 h-6" />
                            <span className="text-sm">Lancement prochain</span>
                        </div>
                    </div>

                    <div className="mt-12 space-y-6">
                        <p className="text-lg text-slate-300">Contactez-nous dès maintenant :</p>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <a href="tel:+22500000000"
                               className="inline-flex items-center space-x-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-300 shadow-md hover:shadow-lg">
                                <Phone className="w-5 h-5" />
                                <span>Appeler</span>
                            </a>
                            <a href="mailto:contact@btpxpress.lions.dev"
                               className="inline-flex items-center space-x-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-300 shadow-md hover:shadow-lg">
                                <Mail className="w-5 h-5" />
                                <span>Email</span>
                            </a>
                            <a href="https://wa.me/225 07 79 56 72 97"
                               className="inline-flex items-center space-x-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-300 shadow-md hover:shadow-lg">
                                <MessageCircle className="w-5 h-5" />
                                <span>WhatsApp</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="mt-16 text-center space-y-3">
                    <p className="text-slate-400 text-sm">
                        © 2024 BTP Xpress Côte d'Ivoire. Tous droits réservés.
                    </p>
                    <a href="https://lions.dev"
                       className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-400 transition-colors duration-300">
                        <span className="text-xs">Développé par</span>
                        <img src={lionsDevLogo} alt="Lions Dev Logo" className="h-6 object-contain" />
                    </a>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;