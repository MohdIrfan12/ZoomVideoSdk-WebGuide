import { Subject } from 'rxjs';


const modalSubject = new Subject();
const modalSubjects = new Subject();

export const modalService = {
    sendModalMessage: message => modalSubject.next(message),
    getModalMessage: () => modalSubject.asObservable(),
    sendModalMessages: message => {
        console.log('sendModalMessages',message);
        modalSubjects.next(message);
    },
    getModalMessages: () => modalSubjects.asObservable()
}